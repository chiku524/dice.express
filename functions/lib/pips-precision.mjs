/**
 * Pips balance arithmetic with 100% precision (2 decimal places).
 * All amounts are in Pips (PP). We use integer cents internally to avoid float drift.
 */

const PIP_DECIMALS = 2
const CENTS_MULT = 10 ** PIP_DECIMALS // 100

/**
 * Parse a Pips amount (string or number) to integer cents. No float arithmetic.
 * @param {string|number} value - e.g. "10.50", 10.5, "0.01"
 * @returns {number} integer cents, e.g. 1050
 */
export function pipsToCents(value) {
  if (value === undefined || value === null) return 0
  const s = String(value).trim()
  if (!s) return 0
  const idx = s.indexOf('.')
  if (idx === -1) {
    const whole = parseInt(s, 10)
    return Number.isNaN(whole) ? 0 : whole * CENTS_MULT
  }
  const whole = parseInt(s.slice(0, idx), 10) || 0
  const frac = s.slice(idx + 1).slice(0, PIP_DECIMALS).padEnd(PIP_DECIMALS, '0')
  const fracNum = parseInt(frac, 10)
  return whole * CENTS_MULT + (Number.isNaN(fracNum) ? 0 : fracNum)
}

/**
 * Format integer cents to a Pips string with exactly 2 decimal places.
 * @param {number} cents - integer cents, e.g. 1050
 * @returns {string} e.g. "10.50"
 */
export function centsToPipsStr(cents) {
  const c = Math.floor(Number(cents) || 0)
  const whole = Math.floor(c / CENTS_MULT)
  const frac = c % CENTS_MULT
  const fracStr = String(frac).padStart(PIP_DECIMALS, '0')
  return `${whole}.${fracStr}`
}

/**
 * Add two Pips amounts (strings or numbers); return result as 2-decimal string.
 * @param {string|number} a - current balance or first amount
 * @param {string|number} b - amount to add
 * @returns {string} sum as "N.NN"
 */
export function addPips(a, b) {
  return centsToPipsStr(pipsToCents(a) + pipsToCents(b))
}

/**
 * Subtract b from a (a - b). Result is floored at 0 for display; caller should check before debit.
 * @param {string|number} a
 * @param {string|number} b
 * @returns {string} difference as "N.NN"
 */
export function subtractPips(a, b) {
  const cents = pipsToCents(a) - pipsToCents(b)
  return centsToPipsStr(Math.max(0, cents))
}

/**
 * Convert raw crypto amount (smallest units) to Pips with exact 2-decimal precision.
 * E.g. USDC 6 decimals: 1_000000 -> 1.00 PP, 1_500000 -> 1.50 PP.
 * @param {string|number} rawAmount - amount in smallest units (e.g. 1000000 for 1 USDC)
 * @param {number} cryptoDecimals - asset decimals (e.g. 6 for USDC)
 * @returns {string} Pips amount as "N.NN"
 */
export function cryptoAmountToPipsStr(rawAmount, cryptoDecimals = 6) {
  const raw = Math.floor(Number(rawAmount) || 0)
  if (raw <= 0) return '0.00'
  // Convert to Pips cents: raw / 10^decimals = Pips units; Pips units * 100 = cents.
  // So cents = raw / 10^(decimals-2). For 6 decimals: 1_000000 -> 100 cents -> 1.00
  const divisor = 10 ** Math.max(0, cryptoDecimals - PIP_DECIMALS)
  const cents = Math.floor(raw / divisor)
  return centsToPipsStr(cents)
}
