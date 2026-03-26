/** Client-side helpers for browse UX (staleness, watchlist, filters). */

const WATCHLIST_KEY = 'dice.markets.watchlist.v1'

export function isOutcomeBasedMarket(payload) {
  if (!payload || typeof payload !== 'object') return true
  const mode = payload.oracleConfig?.newsResolutionMode
  if (mode === 'feed_topic_continuation') return false
  return true
}

export function getMarketStaleness(payload) {
  if (!payload || payload.status !== 'Active') return null
  const d = payload.resolutionDeadline
  if (!d) return null
  const end = new Date(d).getTime()
  if (Number.isNaN(end)) return null
  if (Date.now() > end) return 'pending_resolution'
  return null
}

export function marketCreatedThisWeek(payload) {
  const t = payload?.createdAt
  if (!t) return false
  const ts = new Date(t).getTime()
  if (Number.isNaN(ts)) return false
  return Date.now() - ts < 7 * 24 * 60 * 60 * 1000
}

export function readWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.map(String) : []
  } catch {
    return []
  }
}

export function writeWatchlist(ids) {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...new Set(ids)]))
  } catch {
    /* ignore */
  }
}

export function toggleWatchlist(marketId) {
  const id = String(marketId)
  const cur = readWatchlist()
  const has = cur.includes(id)
  const next = has ? cur.filter((x) => x !== id) : [...cur, id]
  writeWatchlist(next)
  return !has
}

export function isWatched(marketId) {
  return readWatchlist().includes(String(marketId))
}
