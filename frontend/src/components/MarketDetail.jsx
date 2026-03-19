import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { fetchMarkets, fetchPool, executeTrade } from '../services/marketsApi'
import { fetchOpenOrders, placeOrder } from '../services/ordersApi'
import MarketResolution from './MarketResolution'
import ErrorState from './ErrorState'
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import { PREDICTION_STYLES, getCategoryDisplay, getApiSourceLabel, formatResolutionDeadline, getCategoryEmoji, getMarketOneLiner, getResolutionOutcomeSummaries, getDisplayDescription, getResolutionSummary, getNewsMarketDisplayTitle, getNewsMarketMeta } from '../constants/marketConfig'
import { getQuote, isTradeWithinLimit, yesProbability } from '../utils/ammQuote'
import { getSEOForPath } from '../constants/seo'
import './MarketDetail.css'

export default function MarketDetail() {
  const { marketId } = useParams()
  const navigate = useNavigate()
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
        const list = await fetchMarkets()
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
    if (!market?.payload?.marketId || market.payload.marketType !== 'Binary') return
    let cancelled = false
    fetchPool(market.payload.marketId).then((p) => {
      if (!cancelled) setPool(p)
    })
    return () => { cancelled = true }
  }, [market?.payload?.marketId, market?.payload?.marketType])

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
      const list = await fetchMarkets()
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
      <div className="loading">
        <p>Loading market...</p>
        <p className="text-secondary mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
          Fetching market details...
        </p>
      </div>
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
  const title = marketData.title || 'Market'
  const newsDisplayTitle = getNewsMarketDisplayTitle(marketData)
  const displayTitle = newsDisplayTitle || title
  const breadcrumbTitle = displayTitle.length > 50 ? displayTitle.slice(0, 47) + '…' : displayTitle
  const categoryLabel = getCategoryDisplay(marketData)
  const categoryEmoji = getCategoryEmoji(categoryLabel)
  const apiLabel = getApiSourceLabel(marketData)
  const oneLiner = getMarketOneLiner(marketData)
  const outcomeSummaries = getResolutionOutcomeSummaries(marketData)
  const displayDescription = getDisplayDescription(marketData)
  const resolutionSummary = getResolutionSummary(marketData)
  const newsMeta = getNewsMarketMeta(marketData)
  const marketTypeLabel = marketData.marketType === 'Binary'
    ? (PREDICTION_STYLES.find(s => s.value === marketData.styleLabel)?.label || 'Binary')
    : 'Multi-Outcome'
  const isActiveBinary = marketData.status === 'Active' && marketData.marketType === 'Binary' && pool

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
            <span className="market-detail-tag market-detail-tag-api">{apiLabel}</span>
            <span className="market-detail-tag market-detail-tag-type">{marketTypeLabel}</span>
          </div>

          <h1 className="market-detail-title">{displayTitle}</h1>
          {newsMeta && (newsMeta.topic || newsMeta.sourceLabel) && (
            <p className="market-detail-meta">
              {newsMeta.topic && <span>Topic: {newsMeta.topic}</span>}
              {newsMeta.topic && newsMeta.sourceLabel && <span className="market-detail-meta-sep"> · </span>}
              {newsMeta.sourceLabel && <span>Source: {newsMeta.sourceLabel}</span>}
            </p>
          )}
          <span className={`status status-${marketData.status?.toLowerCase() || 'active'}`}>
            {marketData.status}
          </span>

          <section className="market-detail-about" aria-label="About this market">
            <p className="market-detail-oneliner-text"><strong>What you're buying:</strong> {oneLiner}</p>
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

          <div className="market-detail-volumes">
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
          {isActiveBinary && (
            <div className="card market-detail-trade">
              <h2 className="market-detail-trade-title">Buy shares</h2>
              <p className="market-detail-trade-hint">Spend {PLATFORM_CURRENCY_SYMBOL} to buy Yes or No at the current pool price (0.3% fee).</p>
              <div className="form-group">
                <label>Side</label>
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
                const { outputAmount, feeAmount } = getQuote(
                  { yesReserve: pool.yesReserve ?? 0, noReserve: pool.noReserve ?? 0, feeRate: pool.feeRate ?? 0.003 },
                  tradeSide,
                  parseFloat(tradeAmount)
                )
                const withinLimit = isTradeWithinLimit(
                  { yesReserve: pool.yesReserve ?? 0, noReserve: pool.noReserve ?? 0, maxTradeReserveFraction: pool.maxTradeReserveFraction ?? 0.1 },
                  tradeSide,
                  outputAmount
                )
                return (
                  <div className="alert-info market-detail-quote">
                    <p style={{ margin: 0 }}>
                      Pay {formatPips(tradeAmount)} → ~{outputAmount.toFixed(2)} {tradeSide} shares
                      {feeAmount > 0 && ` (fee ${formatPips(feeAmount)})`}
                    </p>
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
                {tradeLoading ? 'Trading…' : 'Confirm trade'}
              </button>
            </div>
          )}

          {marketData.status === 'Active' && marketData.marketType === 'Binary' && (
            <div className="card market-detail-orders">
              <h2 className="market-detail-orders-title">Limit orders</h2>
              <p className="market-detail-orders-hint">Place a limit order. Fills when someone takes the other side (2% fee on settlement).</p>
              {ordersLoading ? (
                <p className="text-secondary">Loading orders…</p>
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
                      {orderLoading ? 'Placing…' : 'Place order'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {marketData.status !== 'Active' && (
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

