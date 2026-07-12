import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { fetchMarketById, fetchPool, executeTrade } from '../services/marketsApi'
import { apiUrl } from '../services/apiBase'
import { fetchOpenOrders, placeOrder, cancelOrder } from '../services/ordersApi'
import MarketResolution from './MarketResolution'
import MarketDetailRelated from './MarketDetailRelated'
import MarketDetailTradePanel from './MarketDetailTradePanel'
import LoadingSpinner from './LoadingSpinner'
import ErrorState from './ErrorState'
import { formatPips } from '../constants/currency'
import { PREDICTION_STYLES, getCategoryDisplay, formatResolutionDeadline, getCategoryEmoji, getMarketOneLiner, getResolutionOutcomeSummaries, getDisplayDescription, getResolutionSummary, getNewsMarketMeta, getMarketApiAttribution, getWhyMarketExistsLine, getPlainEnglishResolution, buildMarketShareDescription, getMarketDataConfidence } from '../constants/marketConfig'
import {
  getQuote,
  isTradeWithinLimit,
  yesProbability,
  getQuoteMulti,
  isTradeWithinLimitMulti,
  outcomeProbabilityMulti,
} from '../utils/ammQuote'
import { getMarketStaleness } from '../utils/marketUX'
import { usePublicConfig } from '../hooks/usePublicConfig'
import { usePipsBalance } from '../hooks/usePipsBalance'
import { getSEOForPath } from '../constants/seo'
import { applyMarketPageShareMeta } from '../utils/shareMeta'
import { getAbsoluteMarketUrl, copyTextToClipboard, canUseWebShare, shareMarketNative } from '../utils/marketLinks'
import {
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
  const [relatedMarkets, setRelatedMarkets] = useState([])
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
        const { market: found, related } = await fetchMarketById(marketId, { related: 5 })
        setMarket(found)
        setRelatedMarkets(related)
      } catch (err) {
        setMarket(null)
        setRelatedMarkets([])
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
      try {
        const { market: found, related } = await fetchMarketById(marketId, { related: 5 })
        setMarket(found)
        setRelatedMarkets(related)
      } catch {
        /* keep current market row if refresh fails */
      }
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

          <MarketDetailRelated relatedMarkets={relatedMarkets} />

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

        <MarketDetailTradePanel
          marketData={marketData}
          pool={pool}
          wallet={wallet}
          ammTradeEnabled={ammTradeEnabled}
          isActiveBinary={isActiveBinary}
          isActiveMultiPool={isActiveMultiPool}
          tradeA11yMessage={tradeA11yMessage}
          tradeAckDismissed={tradeAckDismissed}
          dismissTradeAck={dismissTradeAck}
          tradeSide={tradeSide}
          setTradeSide={setTradeSide}
          tradeTab={tradeTab}
          setTradeTab={setTradeTab}
          tradeAmount={tradeAmount}
          setTradeAmount={setTradeAmount}
          tradeLoading={tradeLoading}
          handleTrade={handleTrade}
          pickBinaryOutcome={pickBinaryOutcome}
          binaryYesPct={binaryYesPct}
          binaryNoPct={binaryNoPct}
          applyMaxSpend={applyMaxSpend}
          balanceLoading={balanceLoading}
          balanceRaw={balanceRaw}
          orderSide={orderSide}
          setOrderSide={setOrderSide}
          orderAmount={orderAmount}
          setOrderAmount={setOrderAmount}
          setOrderPrice={setOrderPrice}
          orderLoading={orderLoading}
          handlePlaceOrder={handlePlaceOrder}
          applyMaxSellShares={applyMaxSellShares}
          limitSellNetShares={limitSellNetShares}
          sellableSharesForOutcome={sellableSharesForOutcome}
          openSellReservedForLimitOutcome={openSellReservedForLimitOutcome}
          limitPriceValid={limitPriceValid}
          limitCentsSlider={limitCentsSlider}
          limitCentsDisplay={limitCentsDisplay}
          ordersLoading={ordersLoading}
          openOrders={openOrders}
          myOpenOrdersOnMarket={myOpenOrdersOnMarket}
          cancellingOrderId={cancellingOrderId}
          handleCancelMyOrder={handleCancelMyOrder}
          userPositions={userPositions}
        />
      </div>

      {marketData.status === 'Active' && wallet?.party === 'Admin' && (
        <MarketResolution market={market} onResolved={() => window.location.reload()} />
      )}
    </div>
  )
}

