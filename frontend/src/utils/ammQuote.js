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
