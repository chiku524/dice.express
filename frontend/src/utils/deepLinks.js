/**
 * Parse desktop deep-link URLs into in-app paths.
 * Scheme: diceexpress://market/<id>  or  diceexpress:///market/<id>
 * Also accepts https://dice.express/market/<id> when passed through.
 */

const APP_HOSTS = new Set(['dice.express', 'www.dice.express', 'dice-express.pages.dev'])

/** Routes that must never be rewritten to /market/<segment>. */
const APP_ROUTE_PREFIXES = [
  '/market/',
  '/discover/',
  '/docs',
  '/documentation',
  '/portfolio',
  '/watchlist',
  '/dashboard',
  '/profile',
  '/activity',
  '/sign-in',
  '/register',
  '/download',
  '/create',
  '/automation',
  '/whitepaper',
  '/privacy',
  '/terms',
  '/executive-summary',
  '/splashscreen',
  '/launch',
]

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
        return normalizeAppPath(`/${host}${path === '/' ? '' : path}${url.search || ''}${url.hash || ''}`)
      }
      return normalizeAppPath(`${path || '/'}${url.search || ''}${url.hash || ''}`)
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

  if (p === '/') return p

  const pathOnly = p.split(/[?#]/)[0]
  if (APP_ROUTE_PREFIXES.some((prefix) => pathOnly === prefix || pathOnly.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`) || pathOnly === prefix)) {
    return p
  }
  // Exact known app routes (no trailing content)
  if (
    pathOnly === '/docs' ||
    pathOnly === '/documentation' ||
    pathOnly === '/splashscreen' ||
    pathOnly === '/launch' ||
    pathOnly === '/sign-in' ||
    pathOnly === '/register' ||
    pathOnly === '/download' ||
    pathOnly === '/create' ||
    pathOnly === '/automation' ||
    pathOnly === '/whitepaper' ||
    pathOnly === '/privacy' ||
    pathOnly === '/terms' ||
    pathOnly === '/executive-summary' ||
    pathOnly === '/portfolio' ||
    pathOnly === '/watchlist' ||
    pathOnly === '/dashboard' ||
    pathOnly === '/profile' ||
    pathOnly === '/activity'
  ) {
    return p
  }

  // Bare market-like ids only (avoid mapping "launch" / "register" → /market/…)
  const bare = pathOnly.replace(/^\//, '')
  if (bare && !bare.includes('/') && isPlausibleMarketId(bare)) {
    return `/market/${bare}${p.slice(pathOnly.length)}`
  }
  return null
}

/** Prefer real market ids over short route words mistaken as hosts. */
function isPlausibleMarketId(id) {
  const s = String(id || '')
  if (s.length < 6) return false
  if (/^(launch|splashscreen|signin|sign-in|register|docs|download|create|portfolio|profile|activity|watchlist|dashboard|markets|market)$/i.test(s)) {
    return false
  }
  return /^[a-zA-Z0-9_.:-]+$/.test(s)
}

/**
 * Discover source value → home query path (mirrors marketConfig.getDiscoverPathForSource).
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
