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
