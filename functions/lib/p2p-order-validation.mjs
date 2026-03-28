/**
 * Server-side checks for P2P limit orders (binary Yes/No). Mirrors frontend marketTradeForm rules.
 */

/** @param {string | undefined} positionType @param {string} outcome */
export function positionMatchesOutcome(positionType, outcome) {
  if (outcome == null || String(outcome).trim() === '') return false
  const o = String(outcome).trim()
  const pt = String(positionType ?? '').trim()
  if (pt === o) return true
  if (pt === `Outcome:${o}`) return true
  return false
}

/**
 * @param {Array<{ status?: string, payload?: { marketId?: string, positionType?: string, amount?: unknown } }>} rows
 */
export function sumPositionSharesForMarketOutcome(rows, marketId, outcome) {
  if (!marketId || !outcome || !Array.isArray(rows)) return 0
  let sum = 0
  for (const row of rows) {
    if (row.status && row.status !== 'Active') continue
    const p = row.payload
    if (!p || p.marketId !== marketId) continue
    if (!positionMatchesOutcome(p.positionType, outcome)) continue
    sum += parseFloat(p.amount) || 0
  }
  return sum
}

/**
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

export function netSellableSharesAfterOpenSells(held, reserved) {
  return Math.max(0, (Number(held) || 0) - (Number(reserved) || 0))
}

/**
 * Active Position rows for party+market (any outcome) and open sells on this outcome for reserved size.
 * @param {*} storage cf-storage module (getContracts, getOpenOrdersByMarket)
 */
export async function loadSellCapacityForBinaryOrder(storage, db, { owner, marketId, outcomeNorm }) {
  const contracts = await storage.getContracts(db, {
    party: owner,
    templateType: 'Position',
    limit: 500,
    marketId,
  })
  const held = sumPositionSharesForMarketOutcome(contracts, marketId, outcomeNorm)
  const openOrders = await storage.getOpenOrdersByMarket(db, marketId, outcomeNorm)
  const reserved = sumOpenSellSharesReservedForOutcome(openOrders, owner, outcomeNorm)
  const net = netSellableSharesAfterOpenSells(held, reserved)
  return { held, reserved, net }
}
