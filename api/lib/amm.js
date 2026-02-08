/**
 * AMM (Automated Market Maker) algorithms — virtual only, no blockchain.
 * Constant product formula, fees, slippage and max trade size.
 */

const DEFAULT_FEE_RATE = 0.003       // 0.3%
const DEFAULT_PLATFORM_FEE_SHARE = 0.2  // 20% of fee to platform
const DEFAULT_MAX_TRADE_FRACTION = 0.1  // max trade = 10% of smallest reserve

/**
 * Get output amount for a trade (constant product with fee).
 * Buying YES: input Credits -> output YES shares (noReserve decreases).
 * Buying NO: input Credits -> output NO shares (yesReserve decreases).
 * @param {object} pool - { yesReserve, noReserve, feeRate }
 * @param {'Yes'|'No'} side - which side to buy
 * @param {number} inputAmount - Credits in
 * @returns {{ outputAmount: number, feeAmount: number, platformFee: number }}
 */
function getQuote(pool, side, inputAmount) {
  const feeRate = pool.feeRate ?? DEFAULT_FEE_RATE
  const platformShare = pool.platformFeeShare ?? DEFAULT_PLATFORM_FEE_SHARE
  const x = side === 'Yes' ? pool.yesReserve : pool.noReserve
  const y = side === 'Yes' ? pool.noReserve : pool.yesReserve
  if (x <= 0 || y <= 0) return { outputAmount: 0, feeAmount: 0, platformFee: 0 }
  const feeMultiplier = 1 - feeRate
  const effectiveInput = inputAmount * feeMultiplier
  const outputAmount = (y * effectiveInput) / (x + effectiveInput)
  const feeAmount = inputAmount * feeRate
  const platformFee = feeAmount * platformShare
  return { outputAmount, feeAmount, platformFee }
}

/**
 * Validate trade size against max fraction of reserve (LP protection).
 * @param {object} pool - { yesReserve, noReserve, maxTradeReserveFraction }
 * @param {'Yes'|'No'} side
 * @param {number} outputAmount
 * @returns {boolean}
 */
function isTradeWithinLimit(pool, side, outputAmount) {
  const maxFrac = pool.maxTradeReserveFraction ?? DEFAULT_MAX_TRADE_FRACTION
  const reserve = side === 'Yes' ? pool.noReserve : pool.yesReserve
  const maxOut = reserve * maxFrac
  return outputAmount <= maxOut
}

/**
 * Execute trade: update pool reserves (mutates pool object).
 * @param {object} pool - pool state (will be mutated)
 * @param {'Yes'|'No'} side
 * @param {number} inputAmount - Credits in
 * @param {number} outputAmount - shares out (from getQuote)
 */
function applyTrade(pool, side, inputAmount, outputAmount) {
  if (side === 'Yes') {
    pool.yesReserve += inputAmount
    pool.noReserve -= outputAmount
  } else {
    pool.noReserve += inputAmount
    pool.yesReserve -= outputAmount
  }
}

/**
 * Add liquidity: update reserves and LP shares (proportional).
 * @param {object} pool - pool state (will be mutated)
 * @param {number} yesAmount
 * @param {number} noAmount
 * @returns {number} lpSharesMinted
 */
function addLiquidity(pool, yesAmount, noAmount) {
  const totalLPShares = pool.totalLPShares ?? 0
  const yesReserve = pool.yesReserve ?? 0
  const noReserve = pool.noReserve ?? 0
  let lpShares = 0
  if (totalLPShares === 0) {
    lpShares = yesAmount + noAmount
    pool.yesReserve = yesReserve + yesAmount
    pool.noReserve = noReserve + noAmount
  } else {
    const k = yesReserve * noReserve
    const newYes = yesReserve + yesAmount
    const newNo = noReserve + noAmount
    const newK = newYes * newNo
    lpShares = totalLPShares * (Math.sqrt(newK / k) - 1)
    if (lpShares <= 0) return 0
    pool.yesReserve = newYes
    pool.noReserve = newNo
  }
  pool.totalLPShares = (pool.totalLPShares ?? 0) + lpShares
  return lpShares
}

/**
 * Remove liquidity: return proportional YES/NO and decrease LP shares.
 * @param {object} pool - pool state (will be mutated)
 * @param {number} lpSharesToBurn
 * @returns {{ yesAmount: number, noAmount: number }}
 */
function removeLiquidity(pool, lpSharesToBurn) {
  const total = pool.totalLPShares ?? 0
  if (total <= 0 || lpSharesToBurn <= 0 || lpSharesToBurn > total) {
    return { yesAmount: 0, noAmount: 0 }
  }
  const frac = lpSharesToBurn / total
  const yesAmount = (pool.yesReserve ?? 0) * frac
  const noAmount = (pool.noReserve ?? 0) * frac
  pool.yesReserve -= yesAmount
  pool.noReserve -= noAmount
  pool.totalLPShares = total - lpSharesToBurn
  return { yesAmount, noAmount }
}

/**
 * Create initial pool state for a new market.
 * @param {string} marketId
 * @param {number} initialYes
 * @param {number} initialNo
 * @param {object} opts - feeRate, platformFeeShare, maxTradeReserveFraction, minLiquidity
 */
function createPoolState(marketId, initialYes = 1000, initialNo = 1000, opts = {}) {
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

module.exports = {
  getQuote,
  isTradeWithinLimit,
  applyTrade,
  addLiquidity,
  removeLiquidity,
  createPoolState,
  DEFAULT_FEE_RATE,
  DEFAULT_PLATFORM_FEE_SHARE,
  DEFAULT_MAX_TRADE_FRACTION,
}
