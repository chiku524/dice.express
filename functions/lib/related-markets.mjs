/**
 * Related markets by title token overlap (server-side mirror of frontend marketConfig).
 * Candidates are list rows like `{ contractId, payload }`.
 */

function tokenizeTitle(title) {
  if (!title || typeof title !== 'string') return []
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

/**
 * @param {Record<string, unknown>} selfPayload
 * @param {Array<{ contractId?: string, payload?: Record<string, unknown> }>} candidates
 * @param {string} selfContractId
 * @param {string} selfMarketId
 * @param {number} [limit]
 */
export function findRelatedMarkets(selfPayload, candidates, selfContractId, selfMarketId, limit = 3) {
  const tokens = new Set(tokenizeTitle(selfPayload?.title))
  if (tokens.size === 0) return []
  const scored = []
  for (const m of candidates) {
    if (!m?.payload) continue
    const pid = m.payload.marketId
    const cid = m.contractId
    if (cid === selfContractId || pid === selfMarketId) continue
    const other = new Set(tokenizeTitle(m.payload.title))
    let overlap = 0
    for (const t of tokens) {
      if (other.has(t)) overlap++
    }
    const strong = [...tokens].some((t) => t.length >= 5 && other.has(t))
    if (overlap >= 2 || (overlap >= 1 && strong)) {
      scored.push({ market: m, score: overlap })
    }
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (parseFloat(b.market.payload?.totalVolume) || 0) - (parseFloat(a.market.payload?.totalVolume) || 0)
  )
  return scored.slice(0, limit).map((s) => s.market)
}
