import { yesProbability } from './ammQuote'

export const BINARY_PIP_PRESETS = [10, 25, 50, 100, 250]
export const LIMIT_SHARE_PRESETS = [10, 25, 50, 100]

/** Suggested limit price (0–1) near current pool implied probability for binary Yes/No. */
export function defaultLimitPriceFromPool(pool, outcome) {
  if (!pool) return '0.50'
  const yp = yesProbability(pool)
  const raw = outcome === 'Yes' ? yp : 1 - yp
  const clamped = Math.min(0.99, Math.max(0.01, Math.round(raw * 100) / 100))
  return clamped.toFixed(2)
}

/** Floor Pips to 2 decimals for max-spend input (avoid float noise). */
export function formatMaxSpendPips(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return ''
  return (Math.floor(n * 100) / 100).toFixed(2)
}

/**
 * Stored `positionType` vs order-book outcome (Yes/No or multi outcome label).
 * Backend uses `Outcome:${name}` for non-binary outcomes.
 */
export function positionMatchesOutcome(positionType, outcome) {
  if (outcome == null || String(outcome).trim() === '') return false
  const o = String(outcome).trim()
  const pt = String(positionType ?? '').trim()
  if (pt === o) return true
  if (pt === `Outcome:${o}`) return true
  return false
}

/**
 * Total shares the user holds for one market outcome (sums multiple Position rows).
 * @param {Array<{ payload?: { marketId?: string, positionType?: string, amount?: unknown }, status?: string }>} positionRows
 */
export function sumSharesForMarketOutcome(positionRows, marketId, outcome) {
  if (!marketId || !outcome || !Array.isArray(positionRows)) return 0
  let sum = 0
  for (const row of positionRows) {
    if (row.status && row.status !== 'Active') continue
    const p = row.payload
    if (!p || p.marketId !== marketId) continue
    if (!positionMatchesOutcome(p.positionType, outcome)) continue
    sum += Number(p.amount) || 0
  }
  return sum
}

/** Floor share count to 2 decimals for limit sell input. */
export function formatMaxSellShares(totalShares) {
  const n = Number(totalShares)
  if (!Number.isFinite(n) || n <= 0) return ''
  const floored = Math.floor(n * 100) / 100
  if (floored <= 0) return ''
  return floored.toFixed(2)
}

/**
 * Shares still tied up in open sell orders for this user/outcome (uses `amountRemaining` after partial fills).
 * Pass the full market book from `GET /api/orders?marketId=…`.
 * @param {Array<{ owner?: string, side?: string, outcome?: string, amountRemaining?: number, amountReal?: number }>} marketOrders
 */
export function sumOpenSellSharesReservedForOutcome(marketOrders, owner, outcome) {
  if (!owner || !outcome || !Array.isArray(marketOrders)) return 0
  let sum = 0
  for (const o of marketOrders) {
    if (o.owner !== owner) continue
    if (o.side !== 'sell') continue
    if (o.outcome !== outcome) continue
    const rem =
      o.amountRemaining != null && Number.isFinite(Number(o.amountRemaining))
        ? Number(o.amountRemaining)
        : Number(o.amountReal) || 0
    if (rem > 0) sum += rem
  }
  return sum
}

/** Position size minus shares already listed on the sell side (open orders). */
export function netSellableSharesAfterOpenSells(positionShares, marketOrders, owner, outcome) {
  const held = Number(positionShares) || 0
  const reserved = sumOpenSellSharesReservedForOutcome(marketOrders, owner, outcome)
  return Math.max(0, held - reserved)
}
