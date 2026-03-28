import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { fetchMarkets, fetchPool, executeTrade } from '../services/marketsApi'
import { apiUrl } from '../services/apiBase'
import { fetchOpenOrders, placeOrder } from '../services/ordersApi'
import MarketResolution from './MarketResolution'
import MultiDiceLoader from './MultiDiceLoader'
import LoadingSpinner from './LoadingSpinner'
import SubmitDiceLabel from './SubmitDiceLabel'
import ErrorState from './ErrorState'
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import { PREDICTION_STYLES, getCategoryDisplay, formatResolutionDeadline, getCategoryEmoji, getMarketOneLiner, getResolutionOutcomeSummaries, getDisplayDescription, getResolutionSummary, getNewsMarketMeta, getMarketApiAttribution } from '../constants/marketConfig'
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
import { getSEOForPath } from '../constants/seo'
import './MarketDetail.css'

export default function MarketDetail() {
  const { marketId } = useParams()
  const { ammTradeEnabled } = usePublicConfig()
  const { wallet } = useWallet()
  const { showToast } = useToastContext()
  const openAccountModal = useAccountModal()
  const [market, setMarket] = useState(null)
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
  const [userPositions, setUserPositions] = useState([])

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
    const loadMarket = async () => {
      try {
        setLoading(true)
        setError(null)
        const list = await fetchMarkets(null, { sort: 'activity' })
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
    if (!wallet?.party || market?.payload?.status !== 'Settled' || !market?.payload?.marketId) {
      setUserPositions([])
      return
    }
    let cancelled = false
    fetch(apiUrl('get-contracts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        party: wallet.party,
        templateType: 'Position',
        limit: 200,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const mid = market.payload.marketId
        const list = (data.contracts || []).filter((c) => c.payload?.marketId === mid)
        setUserPositions(list)
      })
      .catch(() => {
        if (!cancelled) setUserPositions([])
      })
    return () => { cancelled = true }
  }, [wallet?.party, market?.payload?.marketId, market?.payload?.status])

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
      showToast('Sign in to place an order', 'error')
      openAccountModal()
      return
    }
    const amountNum = parseFloat(orderAmount)
    const priceNum = parseFloat(orderPrice)
    if (!orderAmount || isNaN(amountNum) || amountNum <= 0 || isNaN(priceNum) || priceNum < 0 || priceNum > 1) {
      showToast('Enter valid amount and price (0–1)', 'error')
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
        showToast('Matched! Position created.', 'success')
      } else {
        showToast('Order placed. It will fill when someone takes the other side.', 'success')
      }
      setOrderAmount('')
      const list = await fetchOpenOrders(market.payload.marketId)
      setOpenOrders(list)
    } catch (err) {
      showToast(err.message || 'Order failed', 'error')
    } finally {
      setOrderLoading(false)
    }
  }

  const handleTrade = async () => {
    if (!wallet) {
      showToast('Sign in to trade', 'error')
      openAccountModal()
      return
    }
    const amountNum = parseFloat(tradeAmount)
    if (!tradeAmount || isNaN(amountNum) || amountNum <= 0) {
      showToast('Enter a valid amount in Pips', 'error')
      return
    }
    if (!pool || !market?.payload?.marketId) {
      showToast('Pool not loaded. Try refreshing.', 'error')
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
        showToast('Trade would result in zero shares', 'error')
        return
      }
      if (!isTradeWithinLimitMulti(poolForQuote, tradeSide, outputAmount)) {
        showToast('Trade size exceeds pool limit. Try a smaller amount.', 'error')
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
        showToast('Trade would result in zero shares', 'error')
        return
      }
      if (!isTradeWithinLimit(poolForQuote, tradeSide, outputAmount)) {
        showToast('Trade size exceeds pool limit. Try a smaller amount.', 'error')
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
      showToast(`You bought ${result.outputAmount?.toFixed(2) ?? '?'} ${tradeSide} shares`, 'success')
      setTradeAmount('')
      const updatedPool = await fetchPool(market.payload.marketId)
      if (updatedPool) setPool(updatedPool)
      const list = await fetchMarkets(null, { sort: 'activity' })
      const found = list.find((m) => m.contractId === marketId || m.payload?.marketId === marketId)
      if (found) setMarket(found)
    } catch (err) {
      showToast(err.message || 'Trade failed', 'error')
    } finally {
      setTradeLoading(false)
    }
  }

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
  const newsMeta = getNewsMarketMeta(marketData)
  const marketTypeLabel = marketData.marketType === 'Binary'
    ? (PREDICTION_STYLES.find(s => s.value === marketData.styleLabel)?.label || 'Binary')
    : 'Multi-Outcome'
  const isActiveBinary = marketData.status === 'Active' && marketData.marketType === 'Binary' && pool
  const isActiveMultiPool =
    marketData.status === 'Active' && marketData.marketType === 'MultiOutcome' && pool?.poolKind === 'multi'

  return (
    <div className="market-detail">
      <nav className="market-detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Markets</Link>
        <span className="market-detail-breadcrumb-sep" aria-hidden>→</span>
        <span title={displayTitle}>{breadcrumbTitle}</span>
      </nav>

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

          {(marketData.resolutionCriteria || marketData.resolutionDeadline || outcomeSummaries.yes || resolutionSummary) && (
            <section className="market-detail-resolution" aria-label="How it resolves">
              <h3 className="market-detail-resolution-title">📋 How it resolves</h3>
              {marketData.resolutionDeadline && (
                <p className="market-detail-resolution-deadline">
                  <span className="market-detail-resolution-label">⏱️ Resolves by</span>{' '}
                  {formatResolutionDeadline(marketData.resolutionDeadline)}
                </p>
              )}
              {resolutionSummary && (
                <p className="market-detail-resolution-summary">{resolutionSummary}</p>
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

        {/* Bottom: buy/sell shares + limit orders */}
        <div className="market-detail-actions">
          {isActiveBinary && pool && !ammTradeEnabled && (
            <div className="card market-detail-trade alert-info">
              <h2 className="market-detail-trade-title">Peer-to-peer trading</h2>
              <p className="market-detail-trade-hint" style={{ marginBottom: 0 }}>
                Instant pool (AMM) buys are disabled so the platform does not take liquidity risk. Use{' '}
                <strong>limit orders</strong> below to trade with other users.
              </p>
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
          {(isActiveBinary || isActiveMultiPool) && ammTradeEnabled && (
            <div className="card market-detail-trade">
              <h2 className="market-detail-trade-title">Buy shares</h2>
              <p className="market-detail-trade-hint">
                {isActiveMultiPool
                  ? `Spend ${PLATFORM_CURRENCY_SYMBOL} on one outcome. Multi-outcome markets use the pool only (no P2P book). 0.3% pool fee.`
                  : `Spend ${PLATFORM_CURRENCY_SYMBOL} to buy Yes or No at the current pool price (0.3% fee).`}
              </p>
              <div className="form-group">
                <label>{isActiveMultiPool ? 'Outcome' : 'Side'}</label>
                {isActiveMultiPool ? (
                  <select
                    className="filter-select"
                    value={tradeSide}
                    onChange={(e) => setTradeSide(e.target.value)}
                  >
                    {(pool.outcomes || marketData.outcomes || []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <div className="market-detail-side-buttons">
                    <button
                      type="button"
                      className={tradeSide === 'Yes' ? 'btn-primary' : 'btn-secondary'}
                      onClick={() => setTradeSide('Yes')}
                    >
                      Buy Yes
                    </button>
                    <button
                      type="button"
                      className={tradeSide === 'No' ? 'btn-primary' : 'btn-secondary'}
                      onClick={() => setTradeSide('No')}
                    >
                      Buy No
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Amount ({PLATFORM_CURRENCY_SYMBOL})</label>
                <input
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
                if (isActiveMultiPool) {
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
                        Pay {formatPips(tradeAmount)} → ~{outputAmount.toFixed(2)} {tradeSide} shares
                        {feeAmount > 0 && ` (fee ${formatPips(feeAmount)})`}
                      </p>
                      {impact.before != null && impact.delta != null && impact.delta > 0 && (
                        <p style={{ margin: '0.35rem 0 0', fontSize: 'var(--font-size-sm)' }}>
                          Est. price impact on {tradeSide}: ~{(impact.delta * 100).toFixed(2)} pts (implied probability {(impact.before * 100).toFixed(1)}% → {(impact.after * 100).toFixed(1)}%)
                        </p>
                      )}
                      {!withinLimit && (
                        <p style={{ margin: '0.5rem 0 0', color: 'var(--color-warning)' }}>Reduce amount to stay within limit.</p>
                      )}
                    </div>
                  )
                }
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
                      Pay {formatPips(tradeAmount)} → ~{outputAmount.toFixed(2)} {tradeSide} shares
                      {feeAmount > 0 && ` (fee ${formatPips(feeAmount)})`}
                    </p>
                    {impact.before != null && impact.delta != null && impact.delta > 0 && (
                      <p style={{ margin: '0.35rem 0 0', fontSize: 'var(--font-size-sm)' }}>
                        Est. price impact: ~{(impact.delta * 100).toFixed(2)} pts on {tradeSide} (implied {(impact.before * 100).toFixed(1)}% → {(impact.after * 100).toFixed(1)}%)
                      </p>
                    )}
                    {!withinLimit && (
                      <p style={{ margin: '0.5rem 0 0', color: 'var(--color-warning)' }}>Reduce amount to stay within limit.</p>
                    )}
                  </div>
                )
              })()}
              <button
                className="btn-primary market-detail-confirm"
                onClick={handleTrade}
                disabled={tradeLoading || !tradeAmount || parseFloat(tradeAmount) <= 0}
              >
                {tradeLoading ? <SubmitDiceLabel busyLabel="Trading…" /> : 'Confirm trade'}
              </button>
            </div>
          )}

          {marketData.status === 'Active' && marketData.marketType === 'Binary' && (
            <div className="card market-detail-orders">
              <h2 className="market-detail-orders-title">Limit orders</h2>
              <p className="market-detail-orders-hint">Place a limit order. Fills when someone takes the other side (2% fee on settlement).</p>
              {ordersLoading ? (
                <p className="text-secondary market-detail-orders-loading">
                  <MultiDiceLoader size="xs" decorative inline className="market-detail-orders-loading__dice" />
                  <span>Loading orders…</span>
                </p>
              ) : (
                <>
                  {openOrders.length > 0 && (
                    <div className="market-detail-open-orders">
                      <h3 className="market-detail-open-orders-heading">Open orders</h3>
                      <ul className="market-detail-order-list">
                        {openOrders.slice(0, 8).map((o) => (
                          <li key={o.orderId}>
                            {o.side === 'buy' ? 'Buy' : 'Sell'} {o.outcome} — {o.amountReal} @ {(o.priceReal * 100).toFixed(0)}%
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="market-detail-order-form">
                    <div className="form-group">
                      <label>Outcome</label>
                      <select value={orderOutcome} onChange={(e) => setOrderOutcome(e.target.value)}>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Side</label>
                      <select value={orderSide} onChange={(e) => setOrderSide(e.target.value)}>
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Amount (shares)</label>
                      <input
                        type="number"
                        value={orderAmount}
                        onChange={(e) => setOrderAmount(e.target.value)}
                        placeholder="e.g. 100"
                        min="1"
                        step="1"
                      />
                    </div>
                    <div className="form-group">
                      <label>Price (0–1)</label>
                      <input
                        type="number"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        min="0"
                        max="1"
                        step="0.01"
                      />
                    </div>
                    <button
                      className="btn-secondary"
                      onClick={handlePlaceOrder}
                      disabled={orderLoading || !wallet || !orderAmount || parseFloat(orderAmount) <= 0}
                    >
                      {orderLoading ? <SubmitDiceLabel busyLabel="Placing…" /> : 'Place order'}
                    </button>
                  </div>
                </>
              )}
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

