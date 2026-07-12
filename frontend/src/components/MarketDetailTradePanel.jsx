import MultiDiceLoader from './MultiDiceLoader'
import SubmitDiceLabel from './SubmitDiceLabel'
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import {
  getQuote,
  isTradeWithinLimit,
  getQuoteMulti,
  isTradeWithinLimitMulti,
  outcomeProbabilityMulti,
  estimatePriceImpact,
} from '../utils/ammQuote'
import { BINARY_PIP_PRESETS, defaultLimitPriceFromPool } from '../utils/marketTradeForm'
import { formatOrderSizeDisplay } from '../services/ordersApi'

/**
 * Market detail trade column: ack, binary pool/limit, multi pool, settlement.
 */
export default function MarketDetailTradePanel({
  marketData,
  pool,
  wallet,
  ammTradeEnabled,
  isActiveBinary,
  isActiveMultiPool,
  tradeA11yMessage,
  tradeAckDismissed,
  dismissTradeAck,
  tradeSide,
  setTradeSide,
  tradeTab,
  setTradeTab,
  tradeAmount,
  setTradeAmount,
  tradeLoading,
  handleTrade,
  pickBinaryOutcome,
  binaryYesPct,
  binaryNoPct,
  applyMaxSpend,
  balanceLoading,
  balanceRaw,
  orderSide,
  setOrderSide,
  orderAmount,
  setOrderAmount,
  orderPrice,
  setOrderPrice,
  orderLoading,
  handlePlaceOrder,
  applyMaxSellShares,
  limitSellNetShares,
  sellableSharesForOutcome,
  openSellReservedForLimitOutcome,
  limitPriceValid,
  limitCentsSlider,
  limitCentsDisplay,
  ordersLoading,
  openOrders,
  myOpenOrdersOnMarket,
  cancellingOrderId,
  handleCancelMyOrder,
  userPositions,
}) {
  return (
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
  )
}
