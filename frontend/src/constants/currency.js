/**
 * Platform virtual currency (Credits).
 * All platform activity (trading, fees, AMM, rewards) uses this unit.
 * Deposits/withdrawals on supported chains credit/debit this balance.
 */
export const PLATFORM_CURRENCY = {
  name: 'Credits',
  symbol: 'CR',
  decimals: 2,
}

export const PLATFORM_CURRENCY_NAME = PLATFORM_CURRENCY.name
export const PLATFORM_CURRENCY_SYMBOL = PLATFORM_CURRENCY.symbol
export const PLATFORM_CURRENCY_DECIMALS = PLATFORM_CURRENCY.decimals

/** Format amount for display */
export function formatCredits(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  const n = Number(amount)
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: PLATFORM_CURRENCY_DECIMALS,
  }) + ' ' + PLATFORM_CURRENCY_SYMBOL
}
