/**
 * Parse desktop deep-link URLs into in-app paths.
 * Scheme: diceexpress://market/<id>  or  diceexpress:///market/<id>
 * Also accepts https://dice.express/market/<id> when passed through.
 */

const APP_HOSTS = new Set(['dice.express', 'www.dice.express', 'dice-express.pages.dev'])

/**
 * @param {string} raw
 * @returns {string | null} React Router path (e.g. `/market/abc`) or null
 */
export function pathFromDeepLinkUrl(raw) {
  const s = String(raw || '').trim()
  if (!s) return null

  try {
    // Custom scheme without authority: diceexpress:market/x or diceexpress:/market/x
    if (/^diceexpress:/i.test(s) && !/^diceexpress:\/\//i.test(s)) {
      const rest = s.replace(/^diceexpress:/i, '').replace(/^\/+/, '')
      return normalizeAppPath(`/${rest}`)
    }

    const url = new URL(s)
    const scheme = url.protocol.replace(/:$/, '').toLowerCase()

    if (scheme === 'diceexpress') {
      // diceexpress://market/id  → host=market, pathname=/id
      // diceexpress:///market/id → host='', pathname=/market/id
      const host = (url.hostname || '').toLowerCase()
      const path = url.pathname || '/'
      if (host && host !== 'localhost') {
        return normalizeAppPath(`/${host}${path === '/' ? '' : path}`)
      }
      return normalizeAppPath(path || '/')
    }

    if (scheme === 'http' || scheme === 'https') {
      const host = (url.hostname || '').toLowerCase()
      if (!APP_HOSTS.has(host)) return null
      return normalizeAppPath(`${url.pathname || '/'}${url.search || ''}${url.hash || ''}`)
    }
  } catch {
    return null
  }
  return null
}

/**
 * @param {string} path
 */
function normalizeAppPath(path) {
  let p = String(path || '/').trim()
  if (!p.startsWith('/')) p = `/${p}`
  p = p.replace(/\/{2,}/g, '/')
  if (p === '/' || p.startsWith('/market/') || p.startsWith('/discover/') || p.startsWith('/docs') || p.startsWith('/portfolio') || p.startsWith('/watchlist')) {
    return p
  }
  const bare = p.replace(/^\//, '')
  if (bare && !bare.includes('/') && /^[a-zA-Z0-9_.:-]+$/.test(bare)) {
    return `/market/${bare}`
  }
  return null
}

/**
 * Discover source value → home query path (mirrors marketConfig.getDiscoverPathForSource).
 * Kept here so Node tests can import without Vite path resolution.
 * @param {string} sourceValue
 */
export function marketsPathForSource(sourceValue) {
  if (!sourceValue || sourceValue === 'all') return '/'
  return `/?source=${encodeURIComponent(sourceValue)}`
}

/**
 * Map legacy /discover/... path segment to source value.
 * @param {string} segment
 */
export function discoverSegmentToSource(segment) {
  const map = {
    active: 'active',
    sports: 'sports',
    'global-events': 'global_events',
    industry: 'industry',
    'tech-ai': 'tech_ai',
    politics: 'politics',
    entertainment: 'entertainment',
    science: 'science',
    'virtual-realities': 'virtual_realities',
    user: 'user',
  }
  return map[String(segment || '')] || null
}
