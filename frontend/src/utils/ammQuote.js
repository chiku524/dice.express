/**
 * AMM quote for display only (matches backend formula).
 * Used to show "You pay X PP, receive ~Y shares" before calling POST /api/trade.
 */
const DEFAULT_FEE_RATE = 0.003
const DEFAULT_MAX_TRADE_FRACTION = 0.1

export function getQuote(pool, side, inputAmount) {
  const feeRate = pool.feeRate ?? DEFAULT_FEE_RATE
  const x = side === 'Yes' ? pool.yesReserve : pool.noReserve
  const y = side === 'Yes' ? pool.noReserve : pool.yesReserve
  if (x <= 0 || y <= 0) return { outputAmount: 0, feeAmount: 0 }
  const feeMultiplier = 1 - feeRate
  const effectiveInput = inputAmount * feeMultiplier
  const outputAmount = (y * effectiveInput) / (x + effectiveInput)
  const feeAmount = inputAmount * feeRate
  return { outputAmount, feeAmount }
}

export function isTradeWithinLimit(pool, side, outputAmount) {
  const maxFrac = pool.maxTradeReserveFraction ?? DEFAULT_MAX_TRADE_FRACTION
  const reserve = side === 'Yes' ? pool.noReserve : pool.yesReserve
  return outputAmount <= reserve * maxFrac
}

/** Implied probability for Yes (0–1) from pool reserves */
export function yesProbability(pool) {
  const y = pool.yesReserve ?? 0
  const n = pool.noReserve ?? 0
  const total = y + n
  return total > 0 ? y / total : 0.5
}

/** Multi-outcome pool (matches backend getQuoteMulti). */
export function getQuoteMulti(pool, outcome, inputAmount) {
  const reserves = pool.outcomeReserves || {}
  const order = pool.outcomes || Object.keys(reserves)
  if (!order.includes(outcome)) return { outputAmount: 0, feeAmount: 0 }
  const x = reserves[outcome] ?? 0
  const y = order.filter((o) => o !== outcome).reduce((s, o) => s + (reserves[o] ?? 0), 0)
  return getQuote(
    { yesReserve: x, noReserve: y, feeRate: pool.feeRate ?? DEFAULT_FEE_RATE },
    'Yes',
    inputAmount
  )
}

export function isTradeWithinLimitMulti(pool, outcome, outputAmount) {
  const reserves = pool.outcomeReserves || {}
  const order = pool.outcomes || []
  const totalOther = order.filter((o) => o !== outcome).reduce((s, o) => s + (reserves[o] ?? 0), 0)
  const maxFrac = pool.maxTradeReserveFraction ?? DEFAULT_MAX_TRADE_FRACTION
  return outputAmount <= totalOther * maxFrac
}

export function outcomeProbabilityMulti(pool, outcome) {
  const reserves = pool.outcomeReserves || {}
  const total = Object.values(reserves).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  if (total <= 0) return 0
  return (parseFloat(reserves[outcome]) || 0) / total
}

/**
 * Approximate price impact for display: |p_after − p_before| for buying `outcome` with `inputAmount`.
 * Binary: side is 'Yes' | 'No'. Multi: outcome label string.
 */
export function estimatePriceImpact(pool, sideOrOutcome, inputAmount, isMulti) {
  const amt = parseFloat(inputAmount)
  if (!amt || amt <= 0) return { before: null, after: null, delta: null }
  if (isMulti) {
    const before = outcomeProbabilityMulti(pool, sideOrOutcome)
    const { outputAmount } = getQuoteMulti(pool, sideOrOutcome, amt)
    if (outputAmount <= 0) return { before, after: before, delta: 0 }
    const nextReserves = { ...pool.outcomeReserves }
    const order = pool.outcomes || []
    const snap = { ...nextReserves }
    const others = order.filter((o) => o !== sideOrOutcome)
    const totalOther = others.reduce((s, o) => s + (snap[o] ?? 0), 0)
    nextReserves[sideOrOutcome] = (snap[sideOrOutcome] ?? 0) + amt
    if (totalOther > 0) {
      for (const k of others) {
        const prev = snap[k] ?? 0
        nextReserves[k] = prev - outputAmount * (prev / totalOther)
      }
    }
    const afterPool = { outcomeReserves: nextReserves, outcomes: order }
    const after = outcomeProbabilityMulti(afterPool, sideOrOutcome)
    return { before, after, delta: Math.abs(after - before) }
  }
  const before = sideOrOutcome === 'Yes' ? yesProbability(pool) : 1 - yesProbability(pool)
  const { outputAmount } = getQuote(pool, sideOrOutcome, amt)
  if (outputAmount <= 0) return { before, after: before, delta: 0 }
  const p = { ...pool }
  if (sideOrOutcome === 'Yes') {
    p.yesReserve = (p.yesReserve ?? 0) + amt
    p.noReserve = (p.noReserve ?? 0) - outputAmount
  } else {
    p.noReserve = (p.noReserve ?? 0) + amt
    p.yesReserve = (p.yesReserve ?? 0) - outputAmount
  }
  const afterYes = yesProbability(p)
  const after = sideOrOutcome === 'Yes' ? afterYes : 1 - afterYes
  return { before, after, delta: Math.abs(after - before) }
}
