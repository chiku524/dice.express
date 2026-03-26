/**
 * AMM algorithms (ESM for Cloudflare Workers) — constant product, fees, max trade size.
 */
const DEFAULT_FEE_RATE = 0.003
const DEFAULT_PLATFORM_FEE_SHARE = 0.2
const DEFAULT_MAX_TRADE_FRACTION = 0.1

export function getQuote(pool, side, inputAmount) {
  const feeRate = pool.feeRate ?? DEFAULT_FEE_RATE
  const x = side === 'Yes' ? pool.yesReserve : pool.noReserve
  const y = side === 'Yes' ? pool.noReserve : pool.yesReserve
  if (x <= 0 || y <= 0) return { outputAmount: 0, feeAmount: 0, platformFee: 0 }
  const feeMultiplier = 1 - feeRate
  const effectiveInput = inputAmount * feeMultiplier
  const outputAmount = (y * effectiveInput) / (x + effectiveInput)
  const feeAmount = inputAmount * feeRate
  const platformFee = feeAmount * (pool.platformFeeShare ?? DEFAULT_PLATFORM_FEE_SHARE)
  return { outputAmount, feeAmount, platformFee }
}

export function isTradeWithinLimit(pool, side, outputAmount) {
  const maxFrac = pool.maxTradeReserveFraction ?? DEFAULT_MAX_TRADE_FRACTION
  const reserve = side === 'Yes' ? pool.noReserve : pool.yesReserve
  return outputAmount <= reserve * maxFrac
}

export function applyTrade(pool, side, inputAmount, outputAmount) {
  if (side === 'Yes') {
    pool.yesReserve += inputAmount
    pool.noReserve -= outputAmount
  } else {
    pool.noReserve += inputAmount
    pool.yesReserve -= outputAmount
  }
}

export function createPoolState(marketId, initialYes = 1000, initialNo = 1000, opts = {}) {
  return {
    poolId: `pool-${marketId}`,
    marketId,
    poolKind: 'binary',
    yesReserve: initialYes,
    noReserve: initialNo,
    totalLPShares: initialYes + initialNo,
    feeRate: opts.feeRate ?? DEFAULT_FEE_RATE,
    platformFeeShare: opts.platformFeeShare ?? DEFAULT_PLATFORM_FEE_SHARE,
    maxTradeReserveFraction: opts.maxTradeReserveFraction ?? DEFAULT_MAX_TRADE_FRACTION,
    minLiquidity: opts.minLiquidity ?? 100,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Multi-outcome pool: one reserve per outcome; quote uses binary CPMM vs aggregate of other legs.
 * @param {string} marketId
 * @param {string[]} outcomes — unique labels (2–8)
 * @param {number} initialPerOutcome — same starting depth per leg (like binary 1000+1000 → 1000 each)
 */
export function createPoolStateMulti(marketId, outcomes, initialPerOutcome = 1000, opts = {}) {
  const list = Array.isArray(outcomes) ? outcomes : []
  const outcomeReserves = {}
  for (const o of list) {
    outcomeReserves[o] = initialPerOutcome
  }
  const sum = list.reduce((s, o) => s + (outcomeReserves[o] || 0), 0)
  return {
    poolId: `pool-${marketId}`,
    marketId,
    poolKind: 'multi',
    outcomes: [...list],
    outcomeReserves,
    totalLPShares: sum,
    feeRate: opts.feeRate ?? DEFAULT_FEE_RATE,
    platformFeeShare: opts.platformFeeShare ?? DEFAULT_PLATFORM_FEE_SHARE,
    maxTradeReserveFraction: opts.maxTradeReserveFraction ?? DEFAULT_MAX_TRADE_FRACTION,
    minLiquidity: opts.minLiquidity ?? 100,
    createdAt: new Date().toISOString(),
  }
}

/** @param {{ outcomeReserves?: Record<string, number>, outcomes?: string[], feeRate?: number }} pool */
export function getQuoteMulti(pool, outcome, inputAmount) {
  const reserves = pool.outcomeReserves || {}
  const order = pool.outcomes || Object.keys(reserves)
  if (!order.includes(outcome)) return { outputAmount: 0, feeAmount: 0, platformFee: 0 }
  const x = reserves[outcome] ?? 0
  const y = order.filter((o) => o !== outcome).reduce((s, o) => s + (reserves[o] ?? 0), 0)
  return getQuote({ yesReserve: x, noReserve: y, feeRate: pool.feeRate, platformFeeShare: pool.platformFeeShare }, 'Yes', inputAmount)
}

/** @param {{ outcomeReserves: Record<string, number>, outcomes: string[], maxTradeReserveFraction?: number }} pool */
export function isTradeWithinLimitMulti(pool, outcome, outputAmount) {
  const reserves = pool.outcomeReserves || {}
  const order = pool.outcomes || []
  const totalOther = order.filter((o) => o !== outcome).reduce((s, o) => s + (reserves[o] ?? 0), 0)
  const maxFrac = pool.maxTradeReserveFraction ?? DEFAULT_MAX_TRADE_FRACTION
  return outputAmount <= totalOther * maxFrac
}

/**
 * Apply multi trade: add input to chosen outcome reserve; remove output proportionally from others.
 * @param {{ outcomeReserves: Record<string, number>, outcomes: string[] }} pool
 */
export function applyTradeMulti(pool, outcome, inputAmount, outputAmount) {
  const reserves = pool.outcomeReserves
  const order = pool.outcomes || []
  const snap = { ...reserves }
  const others = order.filter((o) => o !== outcome)
  const totalOther = others.reduce((s, o) => s + (snap[o] ?? 0), 0)
  reserves[outcome] = (snap[outcome] ?? 0) + inputAmount
  if (totalOther <= 0) return
  for (const k of others) {
    const prev = snap[k] ?? 0
    reserves[k] = prev - outputAmount * (prev / totalOther)
  }
}

/** Implied probability for one outcome (share of total reserves). */
export function outcomeProbabilityMulti(pool, outcome) {
  const reserves = pool.outcomeReserves || {}
  const total = Object.values(reserves).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  if (total <= 0) return 0
  return (parseFloat(reserves[outcome]) || 0) / total
}
