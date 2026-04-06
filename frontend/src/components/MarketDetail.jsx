import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { fetchMarkets, fetchPool, executeTrade } from '../services/marketsApi'
import { apiUrl } from '../services/apiBase'
import { fetchOpenOrders, placeOrder, cancelOrder, formatOrderSizeDisplay } from '../services/ordersApi'
import MarketResolution from './MarketResolution'
import MultiDiceLoader from './MultiDiceLoader'
import LoadingSpinner from './LoadingSpinner'
import SubmitDiceLabel from './SubmitDiceLabel'
import ErrorState from './ErrorState'
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import { PREDICTION_STYLES, getCategoryDisplay, formatResolutionDeadline, getCategoryEmoji, getMarketOneLiner, getResolutionOutcomeSummaries, getDisplayDescription, getResolutionSummary, getNewsMarketMeta, getMarketApiAttribution, getWhyMarketExistsLine, getPlainEnglishResolution, findRelatedMarkets, buildMarketShareDescription, getMarketDataConfidence } from '../constants/marketConfig'
import {
  getQuote,
  isTradeWithinLimit,
  yesProbability,
  getQuoteMulti,
  isTradeWithinLimitMulti,
  outcomeProbabilityMulti,
  estimatePriceImpact,
} from '../utils/ammQuote'
import { getMarketStaleness } from '../utils/marketUX'
import { usePublicConfig } from '../hooks/usePublicConfig'
import { usePipsBalance } from '../hooks/usePipsBalance'
import { getSEOForPath } from '../constants/seo'
import { applyMarketPageShareMeta } from '../utils/shareMeta'
import { getAbsoluteMarketUrl, copyTextToClipboard, canUseWebShare, shareMarketNative } from '../utils/marketLinks'
import {
  BINARY_PIP_PRESETS,
  defaultLimitPriceFromPool,
  formatMaxSpendPips,
  sumSharesForMarketOutcome,
  formatMaxSellShares,
  sumOpenSellSharesReservedForOutcome,
  netSellableSharesAfterOpenSells,
} from '../utils/marketTradeForm'
import './MarketDetail.css'

export default function MarketDetail() {
  const { marketId } = useParams()
  const { ammTradeEnabled } = usePublicConfig()
  const { wallet } = useWallet()
  const { balanceRaw, balanceLoading, refreshBalance } = usePipsBalance(wallet?.party)
  const { showToast } = useToastContext()
  const openAccountModal = useAccountModal()
  const [market, setMarket] = useState(null)
  const [allMarkets, setAllMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [pool, setPool] = useState(null)
  const [tradeSide, setTradeSide] = useState('Yes')
  const [tradeAmount, setTradeAmount] = useState('')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [openOrders, setOpenOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [orderOutcome, setOrderOutcome] = useState('Yes')
  const [orderSide, setOrderSide] = useState('buy')
  const [orderAmount, setOrderAmount] = useState('')
  const [orderPrice, setOrderPrice] = useState('0.5')
  const [orderLoading, setOrderLoading] = useState(false)
  const [cancellingOrderId, setCancellingOrderId] = useState(null)
  const [userPositions, setUserPositions] = useState([])
  /** Binary: `pool` = instant AMM buy; `limit` = P2P order book. */
  const [tradeTab, setTradeTab] = useState('pool')
  const [tradeA11yMessage, setTradeA11yMessage] = useState('')
  const tradeAckKeyRef = useRef('')
  const [tradeAckDismissed, setTradeAckDismissed] = useState(true)

  const toastTrade = useCallback(
    (msg, kind) => {
      showToast(msg, kind)
      if (kind === 'success' || kind === 'error') setTradeA11yMessage(msg)
    },
    [showToast]
  )

  // SEO: set page title to market title when viewing a specific market
  useEffect(() => {
    const t = market?.payload?.title
    if (t) {
      const short = t.length > 60 ? t.slice(0, 57) + '…' : t
      document.title = `${short} | dice.express`
      return () => { document.title = getSEOForPath('/market').title }
    }
  }, [market?.payload?.title])

  useEffect(() => {
    if (!market?.payload || !marketId || typeof window === 'undefined') return
    const mid = market.payload.marketId
    if (mid !== marketId && market.contractId !== marketId) return
    const canonicalUrl = getAbsoluteMarketUrl(marketId)
    if (!canonicalUrl) return
    const t = market.payload.title || 'Market'
    const short = t.length > 60 ? `${t.slice(0, 57)}…` : t
    const pageTitle = `${short} | dice.express`
    applyMarketPageShareMeta({
      description: buildMarketShareDescription(market.payload),
      canonicalUrl,
      ogTitle: pageTitle,
    })
  }, [market?.payload, market?.contractId, marketId])

  useEffect(() => {
    const key = marketId ? `dice.tradeAck.v1:${marketId}` : ''
    tradeAckKeyRef.current = key
    if (!key || typeof window === 'undefined') {
      setTradeAckDismissed(true)
      return
    }
    try {
      setTradeAckDismissed(window.localStorage.getItem(key) === '1')
    } catch {
      setTradeAckDismissed(false)
    }
  }, [marketId])

  useEffect(() => {
    const loadMarket = async () => {
      try {
        setLoading(true)
        setError(null)
        const list = await fetchMarkets(null, { sort: 'activity' })
        setAllMarkets(list)
        const found = list.find(m => m.contractId === marketId || m.payload?.marketId === marketId)
        if (found) setMarket(found)
        else setError('Market not found')
      } catch (err) {
        setError(err.message || 'Failed to fetch market')
      } finally {
        setLoading(false)
      }
    }
    loadMarket()
  }, [marketId, retryCount])

  useEffect(() => {
    if (!market?.payload?.marketId) return
    const mt = market.payload.marketType
    if (mt !== 'Binary' && mt !== 'MultiOutcome') return
    let cancelled = false
    fetchPool(market.payload.marketId).then((p) => {
      if (!cancelled) setPool(p)
    })
    return () => { cancelled = true }
  }, [market?.payload?.marketId, market?.payload?.marketType])

  const outcomesKey = Array.isArray(market?.payload?.outcomes) ? market.payload.outcomes.join('|') : ''
  useEffect(
    () => {
      const p = market?.payload
      if (!p) return
      if (p.marketType === 'MultiOutcome' && Array.isArray(p.outcomes) && p.outcomes.length) {
        setTradeSide(p.outcomes[0])
      } else {
        setTradeSide('Yes')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset side on market identity change; avoid full payload (list poll)
    [market?.payload?.marketId, market?.payload?.marketType, outcomesKey]
  )

  useEffect(() => {
    if (!ammTradeEnabled) setTradeTab('limit')
    else setTradeTab('pool')
  }, [ammTradeEnabled, market?.payload?.marketId])

  useEffect(() => {
    if (market?.payload?.marketType === 'Binary') {
      setOrderOutcome(tradeSide === 'No' ? 'No' : 'Yes')
    }
  }, [tradeSide, market?.payload?.marketType])

  const positionMarketId = market?.payload?.marketId
  const positionMarketStatus = market?.payload?.status
  const positionMarketType = market?.payload?.marketType

  const fetchUserPositionsForMarket = useCallback(async () => {
    if (!wallet?.party || !positionMarketId) {
      setUserPositions([])
      return
    }
    const needPositions =
      positionMarketStatus === 'Settled' ||
      (positionMarketStatus === 'Active' && positionMarketType === 'Binary')
    if (!needPositions) {
      setUserPositions([])
      return
    }
    try {
      const r = await fetch(apiUrl('get-contracts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party: wallet.party,
          templateType: 'Position',
          marketId: positionMarketId,
          limit: 200,
        }),
      })
      const data = await r.json()
      const list = (data.contracts || []).filter((c) => {
        const st = c.status
        return !st || st === 'Active'
      })
      setUserPositions(list)
    } catch {
      setUserPositions([])
    }
  }, [wallet?.party, positionMarketId, positionMarketStatus, positionMarketType])

  useEffect(() => {
    fetchUserPositionsForMarket()
  }, [fetchUserPositionsForMarket])

  const sellableSharesForOutcome = useMemo(
    () => sumSharesForMarketOutcome(userPositions, market?.payload?.marketId, tradeSide),
    [userPositions, market?.payload?.marketId, tradeSide]
  )

  const openSellReservedForLimitOutcome = useMemo(
    () => sumOpenSellSharesReservedForOutcome(openOrders, wallet?.party ?? '', orderOutcome),
    [openOrders, wallet?.party, orderOutcome]
  )

  const limitSellNetShares = useMemo(
    () =>
      netSellableSharesAfterOpenSells(
        sellableSharesForOutcome,
        openOrders,
        wallet?.party ?? '',
        orderOutcome
      ),
    [sellableSharesForOutcome, openOrders, wallet?.party, orderOutcome]
  )

  const myOpenOrdersOnMarket = useMemo(
    () => (wallet?.party ? openOrders.filter((o) => o.owner === wallet.party) : []),
    [openOrders, wallet?.party]
  )

  useEffect(() => {
    if (!market?.payload?.marketId || market.payload.marketType !== 'Binary') return
    let cancelled = false
    setOrdersLoading(true)
    fetchOpenOrders(market.payload.marketId)
      .then((list) => { if (!cancelled) setOpenOrders(list) })
      .catch(() => { if (!cancelled) setOpenOrders([]) })
      .finally(() => { if (!cancelled) setOrdersLoading(false) })
    return () => { cancelled = true }
  }, [market?.payload?.marketId, market?.payload?.marketType])

  const handlePlaceOrder = async () => {
    if (!wallet) {
      toastTrade('Sign in to place an order', 'error')
      openAccountModal()
      return
    }
    const amountNum = parseFloat(orderAmount)
    const priceNum = parseFloat(orderPrice)
    if (!orderAmount || isNaN(amountNum) || amountNum <= 0 || isNaN(priceNum) || priceNum < 0 || priceNum > 1) {
      toastTrade('Enter valid amount and price (0–1)', 'error')
      return
    }
    if (orderSide === 'sell' && amountNum > limitSellNetShares + 1e-9) {
      toastTrade(
        limitSellNetShares <= 0 && sellableSharesForOutcome > 0
          ? 'All your shares for this outcome are already listed in open sell orders'
          : 'Amount exceeds shares available to sell (after open orders)',
        'error'
      )
      return
    }
    setOrderLoading(true)
    try {
      const result = await placeOrder({
        marketId: market.payload.marketId,
        outcome: orderOutcome,
        side: orderSide,
        amount: amountNum,
        price: priceNum,
        owner: wallet.party,
      })
      if (result.matched) {
        toastTrade('Matched! Position created.', 'success')
      } else {
        toastTrade('Order placed. It will fill when someone takes the other side.', 'success')
      }
      setOrderAmount('')
      const list = await fetchOpenOrders(market.payload.marketId)
      setOpenOrders(list)
      await refreshBalance()
      await fetchUserPositionsForMarket()
    } catch (err) {
      const b = err.responseBody
      if (b?.shortfall != null && b?.required != null) {
        toastTrade(
          `Need ${formatPips(b.shortfall)} more (have ${formatPips(b.current)}, requires ${formatPips(b.required)}).`,
          'error'
        )
      } else if (b?.code === 'SELL_EXCEEDS_POSITION' && b?.availableToSell != null) {
        toastTrade(
          `Sell too large — only ~${Number(b.availableToSell).toFixed(2)} shares free after your other sell orders.`,
          'error'
        )
      } else if (err.status === 429 || String(err.message || '').toLowerCase().includes('too many')) {
        toastTrade('Too many requests — please wait a moment and try again.', 'error')
      } else {
        toastTrade(err.message || 'Order failed', 'error')
      }
    } finally {
      setOrderLoading(false)
    }
  }

  const handleCancelMyOrder = async (orderId) => {
    if (!wallet || !market?.payload?.marketId) return
    setCancellingOrderId(orderId)
    try {
      await cancelOrder(orderId, wallet.party)
      toastTrade('Order cancelled', 'success')
      const list = await fetchOpenOrders(market.payload.marketId)
      setOpenOrders(list)
      await fetchUserPositionsForMarket()
    } catch (e) {
      toastTrade(e.message || 'Cancel failed', 'error')
    } finally {
      setCancellingOrderId(null)
    }
  }

  const applyMaxSpend = () => {
    const s = formatMaxSpendPips(balanceRaw)
    if (!s) {
      toastTrade('No Pips available to spend', 'error')
      return
    }
    setTradeAmount(s)
  }

  const applyMaxSellShares = () => {
    const s = formatMaxSellShares(limitSellNetShares)
    if (!s) {
      if (sellableSharesForOutcome > 0 && openSellReservedForLimitOutcome > 0) {
        toastTrade('All your shares for this outcome are already on the sell book', 'error')
      } else {
        toastTrade(`No ${tradeSide} shares to sell on this market`, 'error')
      }
      return
    }
    setOrderAmount(s)
  }

  const handleTrade = async () => {
    if (!wallet) {
      toastTrade('Sign in to trade', 'error')
      openAccountModal()
      return
    }
    const amountNum = parseFloat(tradeAmount)
    if (!tradeAmount || isNaN(amountNum) || amountNum <= 0) {
      toastTrade('Enter a valid amount in Pips', 'error')
      return
    }
    if (amountNum > balanceRaw + 1e-9) {
      toastTrade('Amount exceeds your Pips balance', 'error')
      return
    }
    if (!pool || !market?.payload?.marketId) {
      toastTrade('Pool not loaded. Try refreshing.', 'error')
      return
    }
    const isMulti = market.payload.marketType === 'MultiOutcome' && pool.poolKind === 'multi'
    if (isMulti) {
      const poolForQuote = {
        outcomeReserves: pool.outcomeReserves || {},
        outcomes: pool.outcomes || [],
        feeRate: pool.feeRate ?? 0.003,
        maxTradeReserveFraction: pool.maxTradeReserveFraction ?? 0.1,
      }
      const { outputAmount } = getQuoteMulti(poolForQuote, tradeSide, amountNum)
      if (outputAmount <= 0) {
        toastTrade('Trade would result in zero shares', 'error')
        return
      }
      if (!isTradeWithinLimitMulti(poolForQuote, tradeSide, outputAmount)) {
        toastTrade('Trade size exceeds pool limit. Try a smaller amount.', 'error')
        return
      }
    } else {
      const poolForQuote = {
        yesReserve: pool.yesReserve ?? 0,
        noReserve: pool.noReserve ?? 0,
        feeRate: pool.feeRate ?? 0.003,
        maxTradeReserveFraction: pool.maxTradeReserveFraction ?? 0.1,
      }
      const { outputAmount } = getQuote(poolForQuote, tradeSide, amountNum)
      if (outputAmount <= 0) {
        toastTrade('Trade would result in zero shares', 'error')
        return
      }
      if (!isTradeWithinLimit(poolForQuote, tradeSide, outputAmount)) {
        toastTrade('Trade size exceeds pool limit. Try a smaller amount.', 'error')
        return
      }
    }
    setTradeLoading(true)
    try {
      const result = await executeTrade({
        marketId: market.payload.marketId,
        side: tradeSide,
        amount: amountNum,
        minOut: 0,
        userId: wallet.party,
      })
      toastTrade(`You bought ${result.outputAmount?.toFixed(2) ?? '?'} ${tradeSide} shares`, 'success')
      setTradeAmount('')
      await refreshBalance()
      await fetchUserPositionsForMarket()
      const updatedPool = await fetchPool(market.payload.marketId)
      if (updatedPool) setPool(updatedPool)
      const list = await fetchMarkets(null, { sort: 'activity' })
      setAllMarkets(list)
      const found = list.find((m) => m.contractId === marketId || m.payload?.marketId === marketId)
      if (found) setMarket(found)
    } catch (err) {
      toastTrade(err.message || 'Trade failed', 'error')
    } finally {
      setTradeLoading(false)
    }
  }

  const pickBinaryOutcome = (outcome) => {
    const o = outcome === 'No' ? 'No' : 'Yes'
    setTradeSide(o)
    setOrderOutcome(o)
    if (pool && market?.payload?.marketType === 'Binary') {
      setOrderPrice(defaultLimitPriceFromPool(pool, o))
    }
  }

  const dismissTradeAck = useCallback(() => {
    const k = tradeAckKeyRef.current
    if (k) {
      try {
        window.localStorage.setItem(k, '1')
      } catch {
        /* ignore */
      }
    }
    setTradeAckDismissed(true)
  }, [])

  const copyMarketLink = useCallback(async () => {
    const url = getAbsoluteMarketUrl(marketId)
    if (!url) return
    const ok = await copyTextToClipboard(url)
    if (ok) toastTrade('Market link copied to clipboard', 'success')
    else toastTrade('Could not copy automatically — copy the URL from the address bar', 'error')
  }, [marketId, toastTrade])

  const relatedMarkets = useMemo(() => {
    if (!market?.payload) return []
    return findRelatedMarkets(
      market.payload,
      allMarkets,
      market.contractId,
      market.payload.marketId,
      5
    )
  }, [market, allMarkets])

  if (loading) {
    return (
      <LoadingSpinner
        size="lg"
        message="Loading market…"
        sublabel="Fetching market details and pool."
        progressSteps={[
          'Rolling the dice…',
          'Finding this market…',
          'Loading liquidity pool…',
          'Almost ready…',
        ]}
      />
    )
  }

  if (error || !market) {
    return (
      <div className="card">
        <ErrorState
          title={error || 'Market not found'}
          message="The market may not exist or there was a connection error."
          onRetry={() => { setError(null); setLoading(true); setRetryCount((c) => c + 1) }}
          retryLabel="Try again"
          secondaryLabel="Back to Markets"
          secondaryTo="/"
        />
      </div>
    )
  }

  const marketData = market.payload
  // Match MarketsList cards: always use payload.title (not synthetic news headline from oracleConfig).
  const displayTitle = marketData.title?.trim() || 'Market'
  const breadcrumbTitle = displayTitle.length > 50 ? displayTitle.slice(0, 47) + '…' : displayTitle
  const categoryLabel = getCategoryDisplay(marketData)
  const categoryEmoji = getCategoryEmoji(categoryLabel)
  const apiAttr = getMarketApiAttribution(marketData)
  const oneLiner = getMarketOneLiner(marketData)
  const outcomeSummaries = getResolutionOutcomeSummaries(marketData)
  const displayDescription = getDisplayDescription(marketData)
  const resolutionSummary = getResolutionSummary(marketData)
  const whyLine = getWhyMarketExistsLine(marketData)
  const plainEnglishLines = getPlainEnglishResolution(marketData)
  const detailConfidence = getMarketDataConfidence(marketData, market.openOrderCount ?? 0)
  const newsMeta = getNewsMarketMeta(marketData)
  const marketTypeLabel = marketData.marketType === 'Binary'
    ? (PREDICTION_STYLES.find(s => s.value === marketData.styleLabel)?.label || 'Binary')
    : 'Multi-Outcome'
  const isActiveBinary = marketData.status === 'Active' && marketData.marketType === 'Binary' && pool
  const isActiveMultiPool =
    marketData.status === 'Active' && marketData.marketType === 'MultiOutcome' && pool?.poolKind === 'multi'
  const binaryYesPct = isActiveBinary ? (yesProbability(pool) * 100).toFixed(0) : ''
  const binaryNoPct = isActiveBinary ? (100 - parseFloat(binaryYesPct)).toFixed(0) : ''
  const limitPriceNum = parseFloat(orderPrice)
  const limitPriceValid = Number.isFinite(limitPriceNum) && limitPriceNum > 0 && limitPriceNum <= 1
  const limitCentsSlider = limitPriceValid
    ? Math.min(99, Math.max(1, Math.round(limitPriceNum * 100)))
    : 50
  const limitCentsDisplay = limitPriceValid ? limitCentsSlider : null

  const shareUrl = getAbsoluteMarketUrl(marketId)
  const webShareEnabled = canUseWebShare()

  const onShareMarketPage = async () => {
    if (!shareUrl || !marketData) return
    const result = await shareMarketNative({
      title: displayTitle,
      text: buildMarketShareDescription(marketData),
      url: shareUrl,
    })
    if (!result.ok && result.reason === 'error') {
      toastTrade('Could not open the share sheet — try Copy link instead', 'error')
    }
  }

  return (
    <div className="market-detail">
      <div className="market-detail-top-bar">
        <nav className="market-detail-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Markets</Link>
          <span className="market-detail-breadcrumb-sep" aria-hidden>→</span>
          <span title={displayTitle}>{breadcrumbTitle}</span>
        </nav>
        <div className="market-detail-share-actions">
          <button
            type="button"
            className="btn-secondary market-detail-copy-link"
            onClick={copyMarketLink}
            title={shareUrl || 'Copy link to this market'}
          >
            Copy link
          </button>
          {webShareEnabled && (
            <button
              type="button"
              className="btn-secondary market-detail-share-native"
              onClick={() => { void onShareMarketPage() }}
              title="Share using your device (apps, AirDrop, etc.)"
            >
              Share…
            </button>
          )}
        </div>
      </div>

      <div className="market-detail-layout">
        {/* Top: market details only */}
        <div className="market-detail-info card">
          <div className="market-detail-tags">
            <span className="market-detail-tag market-detail-tag-category">{categoryEmoji} {categoryLabel}</span>
            {apiAttr.same ? (
              <span
                className="market-detail-tag market-detail-tag-api"
                title="Used to create and resolve this market"
              >
                {apiAttr.creation}
              </span>
            ) : (
              <>
                <span
                  className="market-detail-tag market-detail-tag-creation"
                  title="Feed/API used when this market was created"
                >
                  Creation: {apiAttr.creation}
                </span>
                <span
                  className="market-detail-tag market-detail-tag-resolution"
                  title="Data source or process used to resolve this market"
                >
                  Resolution: {apiAttr.resolution}
                </span>
              </>
            )}
            <span className="market-detail-tag market-detail-tag-type">{marketTypeLabel}</span>
            {getMarketStaleness(marketData) === 'pending_resolution' && (
              <span
                className="market-detail-tag market-detail-tag-stale"
                title="Past scheduled resolution time — oracle or ops may still be processing"
              >
                Pending resolution
              </span>
            )}
            {detailConfidence.label && (
              <span
                className={`market-detail-tag market-detail-tag-confidence${detailConfidence.level === 'thin' ? ' market-detail-tag-confidence--thin' : ''}`}
                title={detailConfidence.hint || undefined}
              >
                {detailConfidence.label}
              </span>
            )}
          </div>

          <h1 className="market-detail-title">{displayTitle}</h1>
          {newsMeta?.topic && (
            <p className="market-detail-meta">
              <span>Topic: {newsMeta.topic}</span>
            </p>
          )}
          <span className={`status status-${marketData.status?.toLowerCase() || 'active'}`}>
            {marketData.status}
          </span>

          <section className="market-detail-about" aria-label="About this market">
            <p className="market-detail-oneliner-text"><strong>What you&apos;re buying:</strong> {oneLiner}</p>
            {displayDescription && <p className="market-detail-desc">{displayDescription}</p>}
          </section>

          <section className="market-detail-why" aria-label="Why this market exists">
            <h3 className="market-detail-why-title">Why this market exists</h3>
            <p className="market-detail-why-text">{whyLine}</p>
          </section>

          {(marketData.resolutionCriteria || marketData.resolutionDeadline || outcomeSummaries.yes || resolutionSummary) && (
            <section className="market-detail-resolution" aria-label="How it resolves">
              <h3 className="market-detail-resolution-title">How it resolves</h3>
              {marketData.resolutionDeadline && (
                <p className="market-detail-resolution-deadline">
                  <span className="market-detail-resolution-label">⏱️ Resolves by</span>{' '}
                  {formatResolutionDeadline(marketData.resolutionDeadline)}
                </p>
              )}
              {resolutionSummary && (
                <p className="market-detail-resolution-summary">{resolutionSummary}</p>
              )}
              {plainEnglishLines.length > 0 && (
                <details className="market-detail-resolution-details market-detail-plain-english">
                  <summary>Plain-language summary</summary>
                  <ul className="market-detail-plain-list">
                    {plainEnglishLines.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </details>
              )}
              {marketData.marketType === 'Binary' && outcomeSummaries.yes && outcomeSummaries.no && (
                <ul className="market-detail-resolution-outcomes" aria-label="Outcome definitions">
                  <li><span className="market-detail-outcome-yes" aria-hidden>✅ Yes</span> {outcomeSummaries.yes}</li>
                  <li><span className="market-detail-outcome-no" aria-hidden>❌ No</span> {outcomeSummaries.no}</li>
                </ul>
              )}
              {marketData.marketType === 'MultiOutcome' && Array.isArray(marketData.outcomes) && marketData.outcomes.length > 0 && (
                <ul className="market-detail-resolution-outcomes" aria-label="Outcomes">
                  {marketData.outcomes.map((o) => (
                    <li key={o}><strong>{o}</strong> — wins if this outcome is chosen at settlement (ops or configured oracle).</li>
                  ))}
                </ul>
              )}
              {marketData.resolutionCriteria && !resolutionSummary && (
                <p className="market-detail-resolution-criteria"><strong>Precise rule:</strong> {marketData.resolutionCriteria}</p>
              )}
              {marketData.resolutionCriteria && resolutionSummary && (
                <details className="market-detail-resolution-details">
                  <summary>Exact resolution rule</summary>
                  <p className="market-detail-resolution-criteria">{marketData.resolutionCriteria}</p>
                </details>
              )}
            </section>
          )}

          {relatedMarkets.length > 0 && (
            <section className="market-detail-related" aria-label="Related markets">
              <h3 className="market-detail-related-title">Related markets</h3>
              <ul className="market-detail-related-list">
                {relatedMarkets.map((rm) => (
                  <li key={rm.contractId || rm.payload?.marketId}>
                    <Link to={`/market/${rm.payload?.marketId}`}>
                      {rm.payload?.title || rm.payload?.marketId}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {marketData.marketType === 'Binary' && pool && (
            <div className="market-detail-odds">
              <span className="status-badge status-active">Yes {(yesProbability(pool) * 100).toFixed(0)}%</span>
              <span className="status-badge status-pending">No {(100 - yesProbability(pool) * 100).toFixed(0)}%</span>
            </div>
          )}
          {isActiveMultiPool && pool.outcomes && (
            <div className="market-detail-odds market-detail-odds--multi">
              {pool.outcomes.map((o) => (
                <span key={o} className="status-badge status-active" title="Pool-implied share of reserves">
                  {o} {(outcomeProbabilityMulti(pool, o) * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          )}

          <div className="market-detail-volumes">
            <div className="market-detail-volume-item">
              <span className="market-detail-volume-label">Open P2P orders</span>
              <span className="volume-display" title="Resting limit orders on the book">
                {market.openOrderCount ?? 0}
              </span>
            </div>
            <div className="market-detail-volume-item">
              <span className="market-detail-volume-label">Total volume</span>
              <span className="volume-display">{formatPips(marketData.totalVolume ?? 0)}</span>
            </div>
            {marketData.marketType === 'Binary' && (
              <>
                <div className="market-detail-volume-item">
                  <span className="market-detail-volume-label">{marketData.outcomes?.[0] || 'Yes'}</span>
                  <span className="volume-display">{formatPips(marketData.yesVolume ?? 0)}</span>
                </div>
                <div className="market-detail-volume-item">
                  <span className="market-detail-volume-label">{marketData.outcomes?.[1] || 'No'}</span>
                  <span className="volume-display">{formatPips(marketData.noVolume ?? 0)}</span>
                </div>
              </>
            )}
          </div>
          {marketData.marketType === 'MultiOutcome' && marketData.outcomeVolumes && Object.keys(marketData.outcomeVolumes).length > 0 && (
            <div className="market-detail-outcome-volumes">
              <span className="market-detail-volume-label">Outcome volumes</span>
              <div className="market-detail-outcome-list">
                {Object.entries(marketData.outcomeVolumes).map(([outcome, volume]) => (
                  <span key={outcome} className="outcome-item">{outcome}: {formatPips(volume)}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom: trade */}
        <div className={`market-detail-actions${isActiveBinary && pool ? ' market-detail-actions--binary' : ''}`}>
          {/*
            Single live region for pool + limit + multi-outcome trades (all use toastTrade).
          */}
          <div id="market-detail-trade-status" className="visually-hidden" aria-live="polite" aria-atomic="true">
            {tradeA11yMessage}
          </div>
          {marketData.status === 'Active' && !tradeAckDismissed && (
            <div className="market-detail-trade-ack card" role="region" aria-label="Before you trade">
              <p className="market-detail-trade-ack-text">
                <strong>Heads up:</strong> Outcomes follow the published rule and oracle data. You can lose Pips. Only trade what you understand — read <em>How it resolves</em> above.
              </p>
              <button type="button" className="btn-primary market-detail-trade-ack-btn" onClick={dismissTradeAck}>
                I understand — continue
              </button>
            </div>
          )}
          {isActiveBinary && pool && (
            <div className="card market-detail-trade-unified">
              <h2 className="market-detail-trade-title">Trade</h2>
              <p className="market-detail-trade-hint market-detail-trade-hint--tight">
                Pick <strong>Yes</strong> or <strong>No</strong>, then either buy instantly from the pool (when enabled) or set a <strong>limit price</strong> to trade with others.
              </p>

              {!ammTradeEnabled && (
                <div className="alert-info market-detail-trade-banner">
                  <strong>Pool buys are off.</strong> This deployment uses peer-to-peer limit orders only (no instant AMM). Place a buy or sell below at your price.
                </div>
              )}

              <p className="market-detail-step-label">Outcome</p>
              <div className="market-detail-outcome-pills" role="group" aria-label="Choose Yes or No">
                <button
                  type="button"
                  className={`market-detail-outcome-pill${tradeSide === 'Yes' ? ' is-selected' : ''}`}
                  onClick={() => pickBinaryOutcome('Yes')}
                >
                  <span className="market-detail-outcome-pill-label">Yes</span>
                  <span className="market-detail-outcome-pill-meta">~{binaryYesPct}%</span>
                </button>
                <button
                  type="button"
                  className={`market-detail-outcome-pill market-detail-outcome-pill--no${tradeSide === 'No' ? ' is-selected' : ''}`}
                  onClick={() => pickBinaryOutcome('No')}
                >
                  <span className="market-detail-outcome-pill-label">No</span>
                  <span className="market-detail-outcome-pill-meta">~{binaryNoPct}%</span>
                </button>
              </div>

              {ammTradeEnabled && (
                <div className="market-detail-trade-tabs" role="tablist" aria-label="How to trade">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tradeTab === 'pool'}
                    className={`market-detail-trade-tab${tradeTab === 'pool' ? ' is-active' : ''}`}
                    onClick={() => setTradeTab('pool')}
                  >
                    Instant (pool)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tradeTab === 'limit'}
                    className={`market-detail-trade-tab${tradeTab === 'limit' ? ' is-active' : ''}`}
                    onClick={() => setTradeTab('limit')}
                  >
                    Limit order
                  </button>
                </div>
              )}

              {ammTradeEnabled && tradeTab === 'pool' && (
                <div className="market-detail-trade-panel">
                  <p className="market-detail-step-label">Spend {PLATFORM_CURRENCY_SYMBOL}</p>
                  <div className="market-detail-preset-row" aria-label="Quick amounts">
                    {BINARY_PIP_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="btn-secondary market-detail-preset-chip"
                        onClick={() => setTradeAmount(String(p))}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn-secondary market-detail-preset-chip market-detail-preset-chip--max"
                      onClick={applyMaxSpend}
                      disabled={!wallet || balanceLoading || balanceRaw <= 0}
                      title="Use your full Pips balance (rounded down to cents)"
                    >
                      Max
                    </button>
                  </div>
                  <div className="form-group">
                    <label htmlFor="market-trade-amount">Amount</label>
                    <input
                      id="market-trade-amount"
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {tradeAmount && parseFloat(tradeAmount) > 0 && pool && (() => {
                    const amt = parseFloat(tradeAmount)
                    const { outputAmount, feeAmount } = getQuote(
                      { yesReserve: pool.yesReserve ?? 0, noReserve: pool.noReserve ?? 0, feeRate: pool.feeRate ?? 0.003 },
                      tradeSide,
                      amt
                    )
                    const withinLimit = isTradeWithinLimit(
                      { yesReserve: pool.yesReserve ?? 0, noReserve: pool.noReserve ?? 0, maxTradeReserveFraction: pool.maxTradeReserveFraction ?? 0.1 },
                      tradeSide,
                      outputAmount
                    )
                    const poolB = {
                      yesReserve: pool.yesReserve ?? 0,
                      noReserve: pool.noReserve ?? 0,
                      feeRate: pool.feeRate ?? 0.003,
                      maxTradeReserveFraction: pool.maxTradeReserveFraction ?? 0.1,
                    }
                    const impact = estimatePriceImpact(poolB, tradeSide, amt, false)
                    return (
                      <div className="alert-info market-detail-quote">
                        <p style={{ margin: 0 }}>
                          ≈ <strong>{outputAmount.toFixed(2)}</strong> {tradeSide} shares for {formatPips(tradeAmount)}
                          {feeAmount > 0 && <span> (fee {formatPips(feeAmount)})</span>}
                        </p>
                        {impact.before != null && impact.delta != null && impact.delta > 0 && (
                          <p className="market-detail-quote-sub">
                            Est. impact on {tradeSide}: ~{(impact.delta * 100).toFixed(2)} pts ({(impact.before * 100).toFixed(1)}% → {(impact.after * 100).toFixed(1)}%)
                          </p>
                        )}
                        {!withinLimit && (
                          <p className="market-detail-quote-warn">Try a smaller amount.</p>
                        )}
                      </div>
                    )
                  })()}
                  <button
                    type="button"
                    className="btn-primary market-detail-confirm"
                    onClick={handleTrade}
                    disabled={tradeLoading || !tradeAmount || parseFloat(tradeAmount) <= 0}
                  >
                    {tradeLoading
                      ? <SubmitDiceLabel busyLabel="Trading…" />
                      : `Buy ${tradeSide} now`}
                  </button>
                  <p className="market-detail-micro-hint">0.3% pool fee. Settlement rules apply when the market resolves.</p>
                </div>
              )}

              {(!ammTradeEnabled || tradeTab === 'limit') && (
                <div className="market-detail-trade-panel">
                  <p className="market-detail-step-label">Limit order</p>
                  <p className="market-detail-trade-hint market-detail-trade-hint--tight">
                    Name your price in <strong>cents per share</strong> (1¢–99¢). Fills when another trader matches you. <strong>2% fee</strong> on settlement.
                    {' '}Sells go to the order book only — the pool does not buy shares back.
                  </p>
                  <div className="market-detail-buy-sell-toggle" role="group" aria-label="Buy or sell shares">
                    <button
                      type="button"
                      className={orderSide === 'buy' ? 'btn-primary' : 'btn-secondary'}
                      onClick={() => setOrderSide('buy')}
                    >
                      Buy {tradeSide}
                    </button>
                    <button
                      type="button"
                      className={orderSide === 'sell' ? 'btn-primary' : 'btn-secondary'}
                      onClick={() => setOrderSide('sell')}
                    >
                      Sell {tradeSide}
                    </button>
                  </div>
                  <div className="form-group">
                    <label htmlFor="market-order-shares">Shares</label>
                    {orderSide === 'sell' && wallet && (
                      <p className="market-detail-micro-hint" style={{ marginTop: 0 }}>
                        {openSellReservedForLimitOutcome > 0
                          ? <>~{limitSellNetShares.toFixed(2)} {tradeSide} shares free to list (~{sellableSharesForOutcome.toFixed(2)} held, ~{openSellReservedForLimitOutcome.toFixed(2)} in open sells).</>
                          : <>You hold ~{sellableSharesForOutcome.toFixed(2)} {tradeSide} shares (all positions on this market).</>}
                      </p>
                    )}
                    <div className="market-detail-preset-row">
                      {[10, 25, 50, 100].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="btn-secondary market-detail-preset-chip"
                          onClick={() => setOrderAmount(String(s))}
                        >
                          {s}
                        </button>
                      ))}
                      {orderSide === 'sell' && (
                        <button
                          type="button"
                          className="btn-secondary market-detail-preset-chip market-detail-preset-chip--max"
                          onClick={applyMaxSellShares}
                          disabled={!wallet || limitSellNetShares <= 0}
                          title="Fill with shares not already on the sell book"
                        >
                          Max
                        </button>
                      )}
                    </div>
                    <input
                      id="market-order-shares"
                      type="number"
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(e.target.value)}
                      placeholder="How many shares"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <div className="market-detail-limit-price-head">
                      <label htmlFor="market-order-cents">Limit price</label>
                      <button
                        type="button"
                        className="market-detail-link-btn"
                        onClick={() => setOrderPrice(defaultLimitPriceFromPool(pool, tradeSide))}
                      >
                        Match pool (~{(tradeSide === 'Yes' ? binaryYesPct : binaryNoPct)}¢)
                      </button>
                    </div>
                    <div className="market-detail-cents-row">
                      <input
                        id="market-order-cents"
                        type="number"
                        min={1}
                        max={99}
                        step={1}
                        value={limitPriceValid ? limitCentsSlider : ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === '') {
                            setOrderPrice('')
                            return
                          }
                          const c = parseInt(raw, 10)
                          if (!Number.isFinite(c)) return
                          const v = Math.min(99, Math.max(1, c))
                          setOrderPrice((v / 100).toFixed(2))
                        }}
                        placeholder="¢"
                        aria-describedby="market-order-cents-hint"
                      />
                      <span className="market-detail-cents-suffix" id="market-order-cents-hint">¢ per share</span>
                    </div>
                    <input
                      type="range"
                      className="market-detail-price-slider"
                      min={1}
                      max={99}
                      value={limitCentsSlider}
                      onChange={(e) => setOrderPrice((Math.min(99, Math.max(1, parseInt(e.target.value, 10))) / 100).toFixed(2))}
                      aria-label="Limit price in cents"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary market-detail-confirm"
                    onClick={handlePlaceOrder}
                    disabled={
                      orderLoading ||
                      !wallet ||
                      !orderAmount ||
                      parseFloat(orderAmount) <= 0 ||
                      !limitPriceValid
                    }
                  >
                    {orderLoading
                      ? <SubmitDiceLabel busyLabel="Placing…" />
                      : `${orderSide === 'buy' ? 'Place buy' : 'Place sell'} · ${tradeSide}${limitCentsDisplay != null ? ` @ ${limitCentsDisplay}¢` : ''}`}
                  </button>
                </div>
              )}

              {ordersLoading ? (
                <p className="text-secondary market-detail-orders-loading market-detail-open-orders--below">
                  <MultiDiceLoader size="xs" decorative inline className="market-detail-orders-loading__dice" />
                  <span>Loading open orders…</span>
                </p>
              ) : openOrders.length > 0 ? (
                <div className="market-detail-open-orders market-detail-open-orders--below">
                  {wallet && myOpenOrdersOnMarket.length > 0 && (
                    <div className="market-detail-my-orders">
                      <h4 className="market-detail-my-orders-heading">Your open orders</h4>
                      <ul className="market-detail-order-list market-detail-order-list--my">
                        {myOpenOrdersOnMarket.map((o) => (
                          <li key={o.orderId} className="market-detail-my-order-row">
                            <span>
                              {o.side === 'buy' ? 'Buy' : 'Sell'} {o.outcome} — {formatOrderSizeDisplay(o)} @ {(o.priceReal * 100).toFixed(0)}¢
                            </span>
                            <button
                              type="button"
                              className="btn-secondary market-detail-cancel-order-btn"
                              disabled={cancellingOrderId === o.orderId}
                              onClick={() => handleCancelMyOrder(o.orderId)}
                            >
                              {cancellingOrderId === o.orderId ? '…' : 'Cancel'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <h3 className="market-detail-open-orders-heading">Open limit orders</h3>
                  <ul className="market-detail-order-list">
                    {openOrders.slice(0, 12).map((o) => (
                      <li key={o.orderId}>
                        {o.side === 'buy' ? 'Buy' : 'Sell'} {o.outcome} — {formatOrderSizeDisplay(o)} @ {(o.priceReal * 100).toFixed(0)}¢
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          {isActiveMultiPool && !ammTradeEnabled && (
            <div className="card market-detail-trade alert-info">
              <h2 className="market-detail-trade-title">Pool trading unavailable</h2>
              <p className="market-detail-trade-hint" style={{ marginBottom: 0 }}>
                Multi-outcome markets use the pool only today (no P2P book). While AMM is off for operator risk control,
                you can follow prices here but cannot open new pool positions — use <strong>binary</strong> markets for
                limit-order trading.
              </p>
            </div>
          )}
          {isActiveMultiPool && ammTradeEnabled && (
            <div className="card market-detail-trade">
              <h2 className="market-detail-trade-title">Buy shares</h2>
              <p className="market-detail-trade-hint">
                Spend {PLATFORM_CURRENCY_SYMBOL} on one outcome. Pool only for multi-outcome markets (0.3% fee).
              </p>
              <p className="market-detail-step-label">Outcome</p>
              <div className="market-detail-outcome-pills market-detail-outcome-pills--wrap" role="group" aria-label="Choose outcome">
                {(pool.outcomes || marketData.outcomes || []).map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={`market-detail-outcome-pill market-detail-outcome-pill--multi${tradeSide === o ? ' is-selected' : ''}`}
                    onClick={() => setTradeSide(o)}
                  >
                    <span className="market-detail-outcome-pill-label">{o}</span>
                    <span className="market-detail-outcome-pill-meta">
                      ~{(outcomeProbabilityMulti(pool, o) * 100).toFixed(0)}%
                    </span>
                  </button>
                ))}
              </div>
              <div className="form-group">
                <label htmlFor="market-multi-amount">Amount ({PLATFORM_CURRENCY_SYMBOL})</label>
                <div className="market-detail-preset-row">
                  {BINARY_PIP_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="btn-secondary market-detail-preset-chip"
                      onClick={() => setTradeAmount(String(p))}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary market-detail-preset-chip market-detail-preset-chip--max"
                    onClick={applyMaxSpend}
                    disabled={!wallet || balanceLoading || balanceRaw <= 0}
                    title="Use your full Pips balance (rounded down to cents)"
                  >
                    Max
                  </button>
                </div>
                <input
                  id="market-multi-amount"
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              {tradeAmount && parseFloat(tradeAmount) > 0 && pool && (() => {
                const amt = parseFloat(tradeAmount)
                const poolM = {
                  outcomeReserves: pool.outcomeReserves || {},
                  outcomes: pool.outcomes || [],
                  feeRate: pool.feeRate ?? 0.003,
                  maxTradeReserveFraction: pool.maxTradeReserveFraction ?? 0.1,
                }
                const { outputAmount, feeAmount } = getQuoteMulti(poolM, tradeSide, amt)
                const withinLimit = isTradeWithinLimitMulti(poolM, tradeSide, outputAmount)
                const impact = estimatePriceImpact(poolM, tradeSide, amt, true)
                return (
                  <div className="alert-info market-detail-quote">
                    <p style={{ margin: 0 }}>
                      ≈ <strong>{outputAmount.toFixed(2)}</strong> {tradeSide} shares for {formatPips(tradeAmount)}
                      {feeAmount > 0 && <span> (fee {formatPips(feeAmount)})</span>}
                    </p>
                    {impact.before != null && impact.delta != null && impact.delta > 0 && (
                      <p className="market-detail-quote-sub">
                        Est. impact on {tradeSide}: ~{(impact.delta * 100).toFixed(2)} pts ({(impact.before * 100).toFixed(1)}% → {(impact.after * 100).toFixed(1)}%)
                      </p>
                    )}
                    {!withinLimit && (
                      <p className="market-detail-quote-warn">Try a smaller amount.</p>
                    )}
                  </div>
                )
              })()}
              <button
                type="button"
                className="btn-primary market-detail-confirm"
                onClick={handleTrade}
                disabled={tradeLoading || !tradeAmount || parseFloat(tradeAmount) <= 0}
              >
                {tradeLoading ? <SubmitDiceLabel busyLabel="Trading…" /> : `Buy ${tradeSide} now`}
              </button>
            </div>
          )}

          {marketData.status === 'Settled' && (
            <div className="card market-detail-settled">
              <h2 className="market-detail-trade-title">Settlement</h2>
              {marketData.resolvedOutcome === 'Void' || marketData.resolvedOutcome === 'Refund' ? (
                <>
                  <p className="market-detail-oneliner-text">
                    Outcome: <strong>Void (refunded)</strong>
                  </p>
                  <p className="text-secondary" style={{ marginTop: '0.35rem' }}>
                    This market did not resolve to a clear Yes/No (or single winning outcome). Stakes were returned to
                    holders per position — check your Portfolio balance. See site documentation for operator-manual
                    automation.
                  </p>
                </>
              ) : (
                <p className="market-detail-oneliner-text">
                  Winning outcome: <strong>{marketData.resolvedOutcome ?? '—'}</strong>
                </p>
              )}
              {wallet && userPositions.length > 0 && (
                <div className="market-detail-settled-positions">
                  <p className="text-secondary" style={{ marginBottom: '0.5rem' }}>Your positions on this market</p>
                  <ul className="market-detail-order-list">
                    {userPositions.map((c) => {
                      const ro = marketData.resolvedOutcome
                      const voided = ro === 'Void' || ro === 'Refund'
                      const ptype = c.payload?.positionType
                      const won =
                        !voided && ro && (ptype === ro || ptype === `Outcome:${ro}`)
                      return (
                        <li key={c.contractId}>
                          {c.payload?.positionType}: {Number(c.payload?.amount ?? 0).toFixed(2)} shares @{' '}
                          {(Number(c.payload?.price ?? 0) * 100).toFixed(0)}%
                          {voided
                            ? ' — stake refunded (void)'
                            : ro
                              ? won
                                ? ' — winning side'
                                : ' — not the winning side'
                              : ''}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', marginTop: '0.75rem' }}>
                Matched (P2P) and pool positions follow platform settlement rules when AMM is enabled. This deployment may
                be <strong>P2P-only</strong> (no AMM) until pool risk is acceptable — see public config and docs.
              </p>
            </div>
          )}

          {marketData.status !== 'Active' && marketData.status !== 'Settled' && (
            <div className="card market-detail-closed">
              <p className="text-secondary">This market is {marketData.status?.toLowerCase() || 'closed'}. Trading is disabled.</p>
            </div>
          )}
        </div>
      </div>

      {marketData.status === 'Active' && wallet?.party === 'Admin' && (
        <MarketResolution market={market} onResolved={() => window.location.reload()} />
      )}
    </div>
  )
}

