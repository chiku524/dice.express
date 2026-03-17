import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { fetchMarkets, fetchPool, executeTrade } from '../services/marketsApi'
import { fetchOpenOrders, placeOrder } from '../services/ordersApi'
import MarketResolution from './MarketResolution'
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import { PREDICTION_STYLES } from '../constants/marketConfig'
import { getQuote, isTradeWithinLimit, yesProbability } from '../utils/ammQuote'
import { getSEOForPath } from '../constants/seo'

export default function MarketDetail() {
  const { marketId } = useParams()
  const navigate = useNavigate()
  const { wallet } = useWallet()
  const { showToast } = useToastContext()
  const openAccountModal = useAccountModal()
  const [market, setMarket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [positionAmount, setPositionAmount] = useState('')
  const [positionType, setPositionType] = useState('Yes')
  const [positionPrice, setPositionPrice] = useState('0.5')
  const [positionLoading, setPositionLoading] = useState(false)
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

  useEffect(() => {
    if (market?.payload) {
      const marketData = market.payload
      if (marketData.marketType === 'MultiOutcome' && marketData.outcomes?.length > 0) {
        setPositionType(marketData.outcomes[0])
      } else if (marketData.outcomes?.length >= 2) {
        setPositionType(marketData.outcomes[0])
      } else {
        setPositionType('Yes')
      }
    }
  }, [market])

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
  }, [marketId])

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

  const handleCreatePosition = async () => {
    if (!wallet) {
      showToast('Sign in to create a position', 'error')
      openAccountModal()
      return
    }

    if (!positionAmount || parseFloat(positionAmount) <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }

    if (!positionPrice || parseFloat(positionPrice) < 0 || parseFloat(positionPrice) > 1) {
      showToast('Please enter a valid price between 0.0 and 1.0', 'error')
      return
    }

    if (!market?.payload?.marketId) {
      showToast('Market not found. Please refresh the page.', 'error')
      return
    }

    setPositionLoading(true)
    try {
      console.log('[MarketDetail] Creating position:', {
        marketId: market.payload.marketId,
        positionType,
        amount: positionAmount,
        price: positionPrice,
        owner: wallet.party
      })

      // Call API to create position in database
      const response = await fetch('/api/create-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          marketId: market.payload.marketId,
          positionType,
          amount: positionAmount,
          price: positionPrice,
          owner: wallet.party
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to create position')
      }

      const result = await response.json()
      console.log('[MarketDetail] ✅ Position created successfully:', result)

      // Update market data with new volumes
      if (result.market && result.market.payload) {
        setMarket({
          ...market,
          payload: {
            ...market.payload,
            totalVolume: result.volumes.totalVolume.toString(),
            yesVolume: result.volumes.yesVolume.toString(),
            noVolume: result.volumes.noVolume.toString(),
            outcomeVolumes: result.volumes.outcomeVolumes
          }
        })
      }

      // Reset form
      setPositionAmount('')
      setPositionPrice('0.5')

      showToast('Position created successfully', 'success')
      navigate('/')
    } catch (err) {
      console.error('[MarketDetail] Error creating position:', err)
      showToast(err.message || 'Failed to create position', 'error')
    } finally {
      setPositionLoading(false)
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
      <div>
        <div className="error">
          <strong>Error:</strong> {error || 'Market not found'}
          <br />
          <small className="mt-sm" style={{ display: 'block' }}>
            The market may not exist or there was a connection error.
          </small>
        </div>
        <div className="mt-md" style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            Back to Markets
          </button>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const marketData = market.payload

  const title = marketData.title || 'Market'
  const breadcrumbTitle = title.length > 50 ? title.slice(0, 47) + '…' : title

  return (
    <div>
      <nav className="breadcrumb mb-lg" aria-label="Breadcrumb" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Markets</Link>
        <span style={{ margin: '0 var(--spacing-sm)' }} aria-hidden>→</span>
        <span title={title}>{breadcrumbTitle}</span>
      </nav>

      <div className="card">
        {(marketData.category || marketData.styleLabel) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
            {marketData.category && (
              <span className="filter-chip" style={{ margin: 0 }}>{marketData.category}</span>
            )}
            {marketData.styleLabel && (
              <span className="status-badge status-pending">
                {PREDICTION_STYLES.find(s => s.value === marketData.styleLabel)?.label || marketData.styleLabel}
              </span>
            )}
          </div>
        )}
        <h1>{marketData.title}</h1>
        <span className={`status status-${marketData.status?.toLowerCase() || 'active'}`}>
          {marketData.status}
        </span>
        <p className="mt-md">{marketData.description}</p>

        {marketData.marketType === 'Binary' && pool && (
          <div className="mt-lg" style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="status-badge status-active">
              Yes {(yesProbability(pool) * 100).toFixed(0)}%
            </span>
            <span className="status-badge status-pending">
              No {(100 - yesProbability(pool) * 100).toFixed(0)}%
            </span>
            <span className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
              (from pool)
            </span>
          </div>
        )}

        <div className="grid-auto-fit-md mt-xl">
          <div>
            <h3>Total Volume</h3>
            <p className="volume-display">{formatPips(marketData.totalVolume ?? 0)}</p>
          </div>
          {marketData.marketType === 'Binary' && (
            <>
              <div>
                <h3>{marketData.outcomes?.[0] || 'Yes'} Volume</h3>
                <p className="volume-display">{formatPips(marketData.yesVolume ?? 0)}</p>
              </div>
              <div>
                <h3>{marketData.outcomes?.[1] || 'No'} Volume</h3>
                <p className="volume-display">{formatPips(marketData.noVolume ?? 0)}</p>
              </div>
            </>
          )}
          {marketData.marketType === 'MultiOutcome' && marketData.outcomeVolumes && Object.keys(marketData.outcomeVolumes).length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <h3>Outcome Volumes</h3>
              <div className="grid-auto-fit-xs mt-sm">
                {Object.entries(marketData.outcomeVolumes).map(([outcome, volume]) => (
                  <div key={outcome} className="outcome-item">
                    <strong>{outcome}:</strong> {formatPips(volume)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AMM Trade (binary markets only) */}
      {marketData.status === 'Active' && marketData.marketType === 'Binary' && pool && (
        <div className="card mt-xl">
          <h2>Trade</h2>
          <p className="text-secondary mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
            Spend Pips to buy Yes or No shares at the current AMM price. 0.3% fee.
          </p>
          <div className="form-group mt-md">
            <label>Side</label>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
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
              <div className="alert-info mb-md">
                <p style={{ margin: 0 }}>
                  You pay {formatPips(tradeAmount)} → receive ~{outputAmount.toFixed(2)} {tradeSide} shares
                  {feeAmount > 0 && ` (fee ${formatPips(feeAmount)})`}.
                </p>
                {!withinLimit && (
                  <p style={{ margin: '0.5rem 0 0', color: 'var(--color-warning)' }}>
                    This trade exceeds the per-trade limit. Use a smaller amount.
                  </p>
                )}
              </div>
            )
          })()}
          <button
            className="btn-primary"
            onClick={handleTrade}
            disabled={tradeLoading || !tradeAmount || parseFloat(tradeAmount) <= 0}
          >
            {tradeLoading ? 'Trading…' : 'Confirm trade'}
          </button>
        </div>
      )}

      {/* Market Resolution Component (for admins) */}
      {marketData.status === 'Active' && wallet?.party === 'Admin' && (
        <MarketResolution market={market} onResolved={() => window.location.reload()} />
      )}

      {marketData.status === 'Active' && (
        <div className="card mt-xl">
          <h2>Create Position (manual price)</h2>
          <div className="alert-info mb-md">
            <strong>Note:</strong> Amounts are in Pips. Positions are stored in the database and market volumes are updated immediately.
          </div>
          <div className="form-group">
            <label>Position Type</label>
            <select
              value={positionType}
              onChange={(e) => setPositionType(e.target.value)}
            >
              {marketData.marketType === 'MultiOutcome' && marketData.outcomes && marketData.outcomes.length > 0 ? (
                marketData.outcomes.map((outcome, index) => (
                  <option key={index} value={outcome}>{outcome}</option>
                ))
              ) : (
                // Binary: use market outcomes if set (True/False, Happens/Doesn't), else Yes/No
                (marketData.outcomes && marketData.outcomes.length >= 2)
                  ? marketData.outcomes.map((outcome, index) => (
                      <option key={index} value={outcome}>{outcome}</option>
                    ))
                  : (
                    <>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </>
                  )
              )}
            </select>
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              value={positionAmount}
              onChange={(e) => setPositionAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label>Price per Share (0.0 - 1.0)</label>
            <input
              type="number"
              value={positionPrice}
              onChange={(e) => setPositionPrice(e.target.value)}
              placeholder="0.5"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleCreatePosition}
            disabled={positionLoading}
          >
            {positionLoading ? 'Creating…' : 'Create Position'}
          </button>
        </div>
      )}

      {/* P2P orders — place order or take the other side; when matched, positions are created */}
      {marketData.status === 'Active' && marketData.marketType === 'Binary' && (
        <div className="card mt-xl">
          <h2>P2P orders</h2>
          <p className="text-secondary mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
            Place a limit order. When someone takes the other side, you get a position and settlement pays winners (2% fee).
          </p>
          {ordersLoading ? (
            <p className="text-secondary">Loading orders…</p>
          ) : (
            <>
              {openOrders.length > 0 && (
                <div className="mb-md">
                  <h3 className="mb-sm">Open orders</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {openOrders.slice(0, 10).map((o) => (
                      <li key={o.orderId} className="mb-xs" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {o.side === 'buy' ? 'Buy' : 'Sell'} {o.outcome} — {o.amountReal} @ {(o.priceReal * 100).toFixed(0)}%
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                className="btn-primary"
                onClick={handlePlaceOrder}
                disabled={orderLoading || !wallet || !orderAmount || parseFloat(orderAmount) <= 0}
              >
                {orderLoading ? 'Placing…' : 'Place order'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

