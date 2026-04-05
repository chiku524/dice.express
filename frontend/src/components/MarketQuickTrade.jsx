import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { usePublicConfig } from '../hooks/usePublicConfig'
import { usePipsBalance } from '../hooks/usePipsBalance'
import { apiUrl } from '../services/apiBase'
import { fetchPool, executeTrade } from '../services/marketsApi'
import { fetchOpenOrders, placeOrder, cancelOrder, formatOrderSizeDisplay } from '../services/ordersApi'
import SubmitDiceLabel from './SubmitDiceLabel'
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import {
  getQuote,
  isTradeWithinLimit,
  yesProbability,
  getQuoteMulti,
  isTradeWithinLimitMulti,
  outcomeProbabilityMulti,
} from '../utils/ammQuote'
import {
  BINARY_PIP_PRESETS,
  LIMIT_SHARE_PRESETS,
  defaultLimitPriceFromPool,
  formatMaxSpendPips,
  sumSharesForMarketOutcome,
  formatMaxSellShares,
  sumOpenSellSharesReservedForOutcome,
  netSellableSharesAfterOpenSells,
} from '../utils/marketTradeForm'
import './MarketQuickTrade.css'

/**
 * Inline trade panel for Discover cards (binary + multi pool). Parent mounts when expanded.
 */
export default function MarketQuickTrade({ market, onTradeSuccess }) {
  const payload = market?.payload
  const marketId = payload?.marketId
  const { ammTradeEnabled } = usePublicConfig()
  const { wallet } = useWallet()
  const { showToast } = useToastContext()
  const [tradeA11y, setTradeA11y] = useState('')
  const announce = useCallback(
    (msg, kind) => {
      showToast(msg, kind)
      if (kind === 'success' || kind === 'error') setTradeA11y(msg)
    },
    [showToast]
  )
  const openAccountModal = useAccountModal()
  const { balanceRaw, balanceLoading, refreshBalance } = usePipsBalance(wallet?.party)

  const [pool, setPool] = useState(null)
  const [poolLoading, setPoolLoading] = useState(true)
  const [tradeSide, setTradeSide] = useState('Yes')
  const [tradeAmount, setTradeAmount] = useState('')
  const [tradeTab, setTradeTab] = useState('pool')
  const [orderSide, setOrderSide] = useState('buy')
  const [orderAmount, setOrderAmount] = useState('')
  const [orderPrice, setOrderPrice] = useState('0.5')
  const [orderOutcome, setOrderOutcome] = useState('Yes')
  const [openOrders, setOpenOrders] = useState([])
  const [tradeLoading, setTradeLoading] = useState(false)
  const [orderLoading, setOrderLoading] = useState(false)
  const [cancellingOrderId, setCancellingOrderId] = useState(null)
  const [userPositionRows, setUserPositionRows] = useState([])

  const isBinary = payload?.marketType === 'Binary'
  const isMulti = payload?.marketType === 'MultiOutcome'
  const isActive = payload?.status === 'Active'
  const isActiveMultiPool = isActive && isMulti && pool?.poolKind === 'multi'
  const isActiveBinary = isActive && isBinary && pool

  useEffect(() => {
    if (!ammTradeEnabled) setTradeTab('limit')
    else setTradeTab('pool')
  }, [ammTradeEnabled, marketId])

  useEffect(() => {
    if (!isBinary) return
    setOrderOutcome(tradeSide === 'No' ? 'No' : 'Yes')
  }, [tradeSide, isBinary])

  useEffect(() => {
    if (!marketId || (!isBinary && !isMulti)) return
    let cancelled = false
    setPoolLoading(true)
    fetchPool(marketId)
      .then((p) => {
        if (!cancelled) setPool(p)
      })
      .catch(() => {
        if (!cancelled) setPool(null)
      })
      .finally(() => {
        if (!cancelled) setPoolLoading(false)
      })
    return () => { cancelled = true }
  }, [marketId, isBinary, isMulti])

  const outcomesKey = Array.isArray(payload?.outcomes) ? payload.outcomes.join('|') : ''
  useEffect(() => {
    if (!payload) return
    if (payload.marketType === 'MultiOutcome' && Array.isArray(payload.outcomes) && payload.outcomes.length) {
      setTradeSide(payload.outcomes[0])
    } else {
      setTradeSide('Yes')
    }
  }, [marketId, payload?.marketType, outcomesKey]) // eslint-disable-line react-hooks/exhaustive-deps -- market identity only

  useEffect(() => {
    if (!isBinary || !marketId) return
    let cancelled = false
    fetchOpenOrders(marketId)
      .then((list) => { if (!cancelled) setOpenOrders(list) })
      .catch(() => { if (!cancelled) setOpenOrders([]) })
    return () => { cancelled = true }
  }, [isBinary, marketId])

  const fetchUserPositionsForMarket = useCallback(async () => {
    if (!wallet?.party || !marketId || !isBinary || !isActive) {
      setUserPositionRows([])
      return
    }
    try {
      const r = await fetch(apiUrl('get-contracts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party: wallet.party,
          templateType: 'Position',
          marketId,
          limit: 200,
        }),
      })
      const data = await r.json()
      const list = (data.contracts || []).filter((c) => {
        const st = c.status
        return !st || st === 'Active'
      })
      setUserPositionRows(list)
    } catch {
      setUserPositionRows([])
    }
  }, [wallet?.party, marketId, isBinary, isActive])

  useEffect(() => {
    fetchUserPositionsForMarket()
  }, [fetchUserPositionsForMarket])

  const sellableSharesForOutcome = useMemo(
    () => sumSharesForMarketOutcome(userPositionRows, marketId, tradeSide),
    [userPositionRows, marketId, tradeSide]
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

  const pickBinaryOutcome = useCallback(
    (outcome) => {
      const o = outcome === 'No' ? 'No' : 'Yes'
      setTradeSide(o)
      setOrderOutcome(o)
      if (pool && isBinary) setOrderPrice(defaultLimitPriceFromPool(pool, o))
    },
    [pool, isBinary]
  )

  const applyMaxSpend = useCallback(() => {
    const s = formatMaxSpendPips(balanceRaw)
    if (!s) {
      announce('No Pips available to spend', 'error')
      return
    }
    setTradeAmount(s)
  }, [balanceRaw, announce])

  const applyMaxSellShares = useCallback(() => {
    const s = formatMaxSellShares(limitSellNetShares)
    if (!s) {
      if (sellableSharesForOutcome > 0 && openSellReservedForLimitOutcome > 0) {
        announce('All your shares for this outcome are already on the sell book', 'error')
      } else {
        announce(`No ${tradeSide} shares to sell`, 'error')
      }
      return
    }
    setOrderAmount(s)
  }, [
    limitSellNetShares,
    sellableSharesForOutcome,
    openSellReservedForLimitOutcome,
    tradeSide,
    announce,
  ])

  const handleTrade = async () => {
    if (!wallet) {
      announce('Sign in to trade', 'error')
      openAccountModal()
      return
    }
    const amountNum = parseFloat(tradeAmount)
    if (!tradeAmount || Number.isNaN(amountNum) || amountNum <= 0) {
      announce('Enter a valid amount in Pips', 'error')
      return
    }
    if (!pool || !marketId) {
      announce('Pool not loaded', 'error')
      return
    }
    if (amountNum > balanceRaw + 1e-9) {
      announce('Amount exceeds your Pips balance', 'error')
      return
    }
    const isMultiPool = isMulti && pool.poolKind === 'multi'
    if (isMultiPool) {
      const poolForQuote = {
        outcomeReserves: pool.outcomeReserves || {},
        outcomes: pool.outcomes || [],
        feeRate: pool.feeRate ?? 0.003,
        maxTradeReserveFraction: pool.maxTradeReserveFraction ?? 0.1,
      }
      const { outputAmount } = getQuoteMulti(poolForQuote, tradeSide, amountNum)
      if (outputAmount <= 0) {
        announce('Trade would result in zero shares', 'error')
        return
      }
      if (!isTradeWithinLimitMulti(poolForQuote, tradeSide, outputAmount)) {
        announce('Trade too large for pool. Try less.', 'error')
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
        announce('Trade would result in zero shares', 'error')
        return
      }
      if (!isTradeWithinLimit(poolForQuote, tradeSide, outputAmount)) {
        announce('Trade too large for pool. Try less.', 'error')
        return
      }
    }
    setTradeLoading(true)
    try {
      const result = await executeTrade({
        marketId,
        side: tradeSide,
        amount: amountNum,
        minOut: 0,
        userId: wallet.party,
      })
      announce(`Bought ~${result.outputAmount?.toFixed(2) ?? '?'} ${tradeSide} shares`, 'success')
      setTradeAmount('')
      const updatedPool = await fetchPool(marketId)
      if (updatedPool) setPool(updatedPool)
      await refreshBalance()
      await fetchUserPositionsForMarket()
      onTradeSuccess?.()
    } catch (err) {
      announce(err.message || 'Trade failed', 'error')
    } finally {
      setTradeLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!wallet) {
      announce('Sign in to place an order', 'error')
      openAccountModal()
      return
    }
    const amountNum = parseFloat(orderAmount)
    const priceNum = parseFloat(orderPrice)
    if (!orderAmount || Number.isNaN(amountNum) || amountNum <= 0 || Number.isNaN(priceNum) || priceNum < 0 || priceNum > 1) {
      announce('Enter shares and a valid limit price', 'error')
      return
    }
    if (orderSide === 'sell' && amountNum > limitSellNetShares + 1e-9) {
      announce(
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
        marketId,
        outcome: orderOutcome,
        side: orderSide,
        amount: amountNum,
        price: priceNum,
        owner: wallet.party,
      })
      announce(result.matched ? 'Matched!' : 'Order placed on the book', 'success')
      setOrderAmount('')
      const list = await fetchOpenOrders(marketId)
      setOpenOrders(list)
      await refreshBalance()
      await fetchUserPositionsForMarket()
      onTradeSuccess?.()
    } catch (err) {
      const b = err.responseBody
      if (b?.shortfall != null && b?.required != null) {
        announce(
          `Need ${formatPips(b.shortfall)} more (have ${formatPips(b.current)}, requires ${formatPips(b.required)}).`,
          'error'
        )
      } else if (b?.code === 'SELL_EXCEEDS_POSITION' && b?.availableToSell != null) {
        announce(
          `Sell too large — only ~${Number(b.availableToSell).toFixed(2)} shares free after your other sell orders.`,
          'error'
        )
      } else if (err.status === 429 || String(err.message || '').toLowerCase().includes('too many')) {
        announce('Too many requests — please wait a moment and try again.', 'error')
      } else {
        announce(err.message || 'Order failed', 'error')
      }
    } finally {
      setOrderLoading(false)
    }
  }

  const handleCancelMyOrder = async (orderId) => {
    if (!wallet || !marketId) return
    setCancellingOrderId(orderId)
    try {
      await cancelOrder(orderId, wallet.party)
      announce('Order cancelled', 'success')
      const list = await fetchOpenOrders(marketId)
      setOpenOrders(list)
      await fetchUserPositionsForMarket()
      onTradeSuccess?.()
    } catch (e) {
      announce(e.message || 'Cancel failed', 'error')
    } finally {
      setCancellingOrderId(null)
    }
  }

  if (!payload || !marketId) return null

  const detailHref = `/market/${marketId}`

  if (!isActive) {
    return (
      <div className="market-quick-trade market-quick-trade--inactive">
        <p className="market-quick-trade-muted">Trading is closed for this market.</p>
        <Link to={detailHref} className="market-quick-trade-link">View market</Link>
      </div>
    )
  }

  if (poolLoading) {
    return (
      <div className="market-quick-trade market-quick-trade--loading">
        <span className="market-quick-trade-muted">Loading pool…</span>
      </div>
    )
  }

  if (isBinary && !pool) {
    return (
      <div className="market-quick-trade market-quick-trade--inactive">
        <p className="market-quick-trade-muted">Pool unavailable. Open the market page to retry.</p>
        <Link to={detailHref} className="market-quick-trade-link">View market</Link>
      </div>
    )
  }

  if (isMulti && isActive && !pool) {
    return (
      <div className="market-quick-trade market-quick-trade--inactive">
        <p className="market-quick-trade-muted">Pool not loaded. Try the full market page.</p>
        <Link to={detailHref} className="market-quick-trade-link">View market</Link>
      </div>
    )
  }

  const limitPriceNum = parseFloat(orderPrice)
  const limitPriceValid = Number.isFinite(limitPriceNum) && limitPriceNum > 0 && limitPriceNum <= 1
  const limitCentsSlider = limitPriceValid
    ? Math.min(99, Math.max(1, Math.round(limitPriceNum * 100)))
    : 50
  const limitCentsDisplay = limitPriceValid ? limitCentsSlider : null

  const binaryYesPct = isActiveBinary ? (yesProbability(pool) * 100).toFixed(0) : ''
  const binaryNoPct = isActiveBinary ? (100 - parseFloat(binaryYesPct)).toFixed(0) : ''

  if (isActiveBinary) {
    return (
      <div className="market-quick-trade">
        <div className="visually-hidden" aria-live="polite" aria-atomic="true">{tradeA11y}</div>
        <div className="market-quick-trade-head">
          <span className="market-quick-trade-title">Quick trade</span>
          <Link to={detailHref} className="market-quick-trade-link">Full page</Link>
        </div>

        {!ammTradeEnabled && (
          <p className="market-quick-trade-note">Pool off — limit orders only.</p>
        )}

        <div className="market-quick-outcome-pills" role="group" aria-label="Yes or No">
          <button
            type="button"
            className={`market-quick-pill${tradeSide === 'Yes' ? ' is-on' : ''}`}
            onClick={() => pickBinaryOutcome('Yes')}
          >
            Yes <span className="market-quick-pill-pct">~{binaryYesPct}%</span>
          </button>
          <button
            type="button"
            className={`market-quick-pill${tradeSide === 'No' ? ' is-on' : ''}`}
            onClick={() => pickBinaryOutcome('No')}
          >
            No <span className="market-quick-pill-pct">~{binaryNoPct}%</span>
          </button>
        </div>

        {ammTradeEnabled && (
          <div className="market-quick-tabs">
            <button
              type="button"
              className={tradeTab === 'pool' ? 'is-on' : ''}
              onClick={() => setTradeTab('pool')}
            >
              Instant
            </button>
            <button
              type="button"
              className={tradeTab === 'limit' ? 'is-on' : ''}
              onClick={() => setTradeTab('limit')}
            >
              Limit
            </button>
          </div>
        )}

        {ammTradeEnabled && tradeTab === 'pool' && (
          <div className="market-quick-section">
            <div className="market-quick-presets">
              {BINARY_PIP_PRESETS.map((p) => (
                <button key={p} type="button" className="market-quick-chip" onClick={() => setTradeAmount(String(p))}>
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="market-quick-chip market-quick-chip--max"
                onClick={applyMaxSpend}
                disabled={!wallet || balanceLoading || balanceRaw <= 0}
                title="Fill with your full Pips balance"
              >
                Max
              </button>
            </div>
            <div className="market-quick-field">
              <label htmlFor={`qt-amt-${marketId}`}>{PLATFORM_CURRENCY_SYMBOL}</label>
              <input
                id={`qt-amt-${marketId}`}
                type="number"
                min="0"
                step="0.01"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            {tradeAmount && parseFloat(tradeAmount) > 0 && pool && (() => {
              const amt = parseFloat(tradeAmount)
              const poolB = {
                yesReserve: pool.yesReserve ?? 0,
                noReserve: pool.noReserve ?? 0,
                feeRate: pool.feeRate ?? 0.003,
                maxTradeReserveFraction: pool.maxTradeReserveFraction ?? 0.1,
              }
              const { outputAmount, feeAmount } = getQuote(poolB, tradeSide, amt)
              const within = isTradeWithinLimit(
                { yesReserve: pool.yesReserve ?? 0, noReserve: pool.noReserve ?? 0, maxTradeReserveFraction: pool.maxTradeReserveFraction ?? 0.1 },
                tradeSide,
                outputAmount
              )
              return (
                <p className="market-quick-quote">
                  ≈ <strong>{outputAmount.toFixed(2)}</strong> {tradeSide} for {formatPips(tradeAmount)}
                  {feeAmount > 0 && <span> (fee {formatPips(feeAmount)})</span>}
                  {!within && <span className="market-quick-warn"> Reduce size.</span>}
                </p>
              )
            })()}
            <button
              type="button"
              className="btn-primary market-quick-cta"
              onClick={handleTrade}
              disabled={tradeLoading || !tradeAmount || parseFloat(tradeAmount) <= 0}
            >
              {tradeLoading ? <SubmitDiceLabel busyLabel="…" /> : `Buy ${tradeSide}`}
            </button>
          </div>
        )}

        {(!ammTradeEnabled || tradeTab === 'limit') && (
          <div className="market-quick-section">
            <div className="market-quick-bs">
              <button type="button" className={orderSide === 'buy' ? 'is-on' : ''} onClick={() => setOrderSide('buy')}>Buy</button>
              <button type="button" className={orderSide === 'sell' ? 'is-on' : ''} onClick={() => setOrderSide('sell')}>Sell</button>
            </div>
            <p className="market-quick-hint">Limit in ¢/share. Pool cannot buy back shares — sells match other traders.</p>
            {orderSide === 'sell' && wallet && (
              <p className="market-quick-hint">
                {openSellReservedForLimitOutcome > 0
                  ? <>~{limitSellNetShares.toFixed(2)} {tradeSide} sh free to list (~{sellableSharesForOutcome.toFixed(2)} held, ~{openSellReservedForLimitOutcome.toFixed(2)} in open sells).</>
                  : <>You hold ~{sellableSharesForOutcome.toFixed(2)} {tradeSide} shares.</>}
              </p>
            )}
            <div className="market-quick-presets">
              {LIMIT_SHARE_PRESETS.map((s) => (
                <button key={s} type="button" className="market-quick-chip" onClick={() => setOrderAmount(String(s))}>
                  {s} sh
                </button>
              ))}
              {orderSide === 'sell' && (
                <button
                  type="button"
                  className="market-quick-chip market-quick-chip--max"
                  onClick={applyMaxSellShares}
                  disabled={!wallet || limitSellNetShares <= 0}
                  title="Shares not already on the sell book"
                >
                  Max
                </button>
              )}
            </div>
            <div className="market-quick-field">
              <label htmlFor={`qt-sh-${marketId}`}>Shares</label>
              <input
                id={`qt-sh-${marketId}`}
                type="number"
                min="0"
                step="0.01"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
              />
            </div>
            <div className="market-quick-field market-quick-field--row">
              <label htmlFor={`qt-c-${marketId}`}>Limit ¢</label>
              <button
                type="button"
                className="market-quick-link"
                onClick={() => setOrderPrice(defaultLimitPriceFromPool(pool, tradeSide))}
              >
                Match pool (~{tradeSide === 'Yes' ? binaryYesPct : binaryNoPct}¢)
              </button>
            </div>
            <input
              id={`qt-c-${marketId}`}
              type="range"
              className="market-quick-slider"
              min={1}
              max={99}
              value={limitCentsSlider}
              onChange={(e) => setOrderPrice((Math.min(99, Math.max(1, parseInt(e.target.value, 10))) / 100).toFixed(2))}
              aria-label="Limit price cents"
            />
            <button
              type="button"
              className="btn-secondary market-quick-cta"
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
                ? <SubmitDiceLabel busyLabel="…" />
                : `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${tradeSide}${limitCentsDisplay != null ? ` @ ${limitCentsDisplay}¢` : ''}`}
            </button>
          </div>
        )}

        {wallet && myOpenOrdersOnMarket.length > 0 && (
          <div className="market-quick-my-orders">
            <p className="market-quick-my-orders-label">Yours</p>
            <ul className="market-quick-orders market-quick-orders--mine">
              {myOpenOrdersOnMarket.map((o) => (
                <li key={o.orderId} className="market-quick-order-row">
                  <span>
                    {o.side === 'buy' ? 'Buy' : 'Sell'} {o.outcome} {formatOrderSizeDisplay(o)} @ {(o.priceReal * 100).toFixed(0)}¢
                  </span>
                  <button
                    type="button"
                    className="market-quick-cancel"
                    disabled={cancellingOrderId === o.orderId}
                    onClick={() => handleCancelMyOrder(o.orderId)}
                  >
                    {cancellingOrderId === o.orderId ? '…' : '×'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openOrders.length > 0 && (
          <ul className="market-quick-orders">
            {openOrders.slice(0, 6).map((o) => (
              <li key={o.orderId}>
                {o.side === 'buy' ? 'Buy' : 'Sell'} {o.outcome} {formatOrderSizeDisplay(o)} @ {(o.priceReal * 100).toFixed(0)}¢
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  if (isActiveMultiPool && !ammTradeEnabled) {
    return (
      <div className="market-quick-trade market-quick-trade--inactive">
        <p className="market-quick-trade-muted">Multi-outcome pool trading is off. Use binary markets for limits.</p>
        <Link to={detailHref} className="market-quick-trade-link">View market</Link>
      </div>
    )
  }

  if (isActiveMultiPool && ammTradeEnabled) {
    return (
      <div className="market-quick-trade">
        <div className="visually-hidden" aria-live="polite" aria-atomic="true">{tradeA11y}</div>
        <div className="market-quick-trade-head">
          <span className="market-quick-trade-title">Quick buy (pool)</span>
          <Link to={detailHref} className="market-quick-trade-link">Full page</Link>
        </div>
        <div className="market-quick-outcome-pills market-quick-outcome-pills--wrap">
          {(pool.outcomes || payload.outcomes || []).map((o) => (
            <button
              key={o}
              type="button"
              className={`market-quick-pill market-quick-pill--sm${tradeSide === o ? ' is-on' : ''}`}
              onClick={() => setTradeSide(o)}
            >
              {o} <span className="market-quick-pill-pct">~{(outcomeProbabilityMulti(pool, o) * 100).toFixed(0)}%</span>
            </button>
          ))}
        </div>
        <div className="market-quick-presets">
          {BINARY_PIP_PRESETS.map((p) => (
            <button key={p} type="button" className="market-quick-chip" onClick={() => setTradeAmount(String(p))}>
              {p}
            </button>
          ))}
          <button
            type="button"
            className="market-quick-chip market-quick-chip--max"
            onClick={applyMaxSpend}
            disabled={!wallet || balanceLoading || balanceRaw <= 0}
          >
            Max
          </button>
        </div>
        <div className="market-quick-field">
          <label htmlFor={`qt-m-${marketId}`}>{PLATFORM_CURRENCY_SYMBOL}</label>
          <input
            id={`qt-m-${marketId}`}
            type="number"
            min="0"
            step="0.01"
            value={tradeAmount}
            onChange={(e) => setTradeAmount(e.target.value)}
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
          const within = isTradeWithinLimitMulti(poolM, tradeSide, outputAmount)
          return (
            <p className="market-quick-quote">
              ≈ <strong>{outputAmount.toFixed(2)}</strong> {tradeSide} for {formatPips(tradeAmount)}
              {feeAmount > 0 && <span> (fee {formatPips(feeAmount)})</span>}
              {!within && <span className="market-quick-warn"> Reduce size.</span>}
            </p>
          )
        })()}
        <button
          type="button"
          className="btn-primary market-quick-cta"
          onClick={handleTrade}
          disabled={tradeLoading || !tradeAmount || parseFloat(tradeAmount) <= 0}
        >
          {tradeLoading ? <SubmitDiceLabel busyLabel="…" /> : `Buy ${tradeSide}`}
        </button>
      </div>
    )
  }

  return (
    <div className="market-quick-trade market-quick-trade--inactive">
      <Link to={detailHref} className="market-quick-trade-link">View market to trade</Link>
    </div>
  )
}
