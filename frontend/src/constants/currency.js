/**
 * Platform currency: Pips.
 * Users deposit (crypto / card) to receive Pips; they trade and withdraw earnings (withdrawal fee applies).
 */
export const PLATFORM_CURRENCY = {
  name: 'Pips',
  symbol: 'PP',
  decimals: 2,
}

export const PLATFORM_CURRENCY_NAME = PLATFORM_CURRENCY.name
export const PLATFORM_CURRENCY_SYMBOL = PLATFORM_CURRENCY.symbol
export const PLATFORM_CURRENCY_DECIMALS = PLATFORM_CURRENCY.decimals

/** Format amount for display (e.g. "1,234.56 PP") */
export function formatGuap(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  const n = Number(amount)
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: PLATFORM_CURRENCY_DECIMALS,
  }) + ' ' + PLATFORM_CURRENCY_SYMBOL
}

/** Alias for display (Pips branding) */
export function formatPips(amount) {
  return formatGuap(amount)
}

/** @deprecated Use formatGuap or formatPips */
export const formatCredits = formatGuap
