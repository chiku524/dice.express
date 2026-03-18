/**
 * Market categories and prediction styles for the platform.
 * Used in Create Market and for filtering/browsing.
 */

export const MARKET_CATEGORIES = [
  { value: 'Finance', label: 'Finance' },
  { value: 'Crypto', label: 'Crypto' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Politics', label: 'Politics' },
  { value: 'Weather', label: 'Weather' },
  { value: 'News', label: 'News' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Science', label: 'Science' },
  { value: 'Tech & AI', label: 'Tech & AI' },
  { value: 'Other', label: 'Other' },
]

/** Market sources: automated (sports, global events, industry, VR) + category-based (tech_ai, politics, etc.) vs user-created. */
export const MARKET_SOURCES = [
  { value: 'all', label: 'All Markets' },
  { value: 'active', label: 'With volume' },
  { value: 'sports', label: 'Sports' },
  { value: 'global_events', label: 'Weather & News' },
  { value: 'industry', label: 'Finance & Crypto' },
  { value: 'tech_ai', label: 'Tech & AI' },
  { value: 'politics', label: 'Politics' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'science', label: 'Science' },
  { value: 'virtual_realities', label: 'Virtual Realities' },
  { value: 'user', label: 'User-Created' },
]

/** URL path segment for Discover routes (must match App.jsx Route paths). Use for Navbar links. */
export function getDiscoverPathForSource(sourceValue) {
  if (sourceValue === 'all') return '/'
  if (sourceValue === 'sports') return '/discover/sports'
  if (sourceValue === 'global_events') return '/discover/global-events'
  if (sourceValue === 'industry') return '/discover/industry'
  if (sourceValue === 'tech_ai') return '/discover/tech-ai'
  if (sourceValue === 'politics') return '/discover/politics'
  if (sourceValue === 'entertainment') return '/discover/entertainment'
  if (sourceValue === 'science') return '/discover/science'
  if (sourceValue === 'virtual_realities') return '/discover/virtual-realities'
  if (sourceValue === 'active') return '/discover/active'
  if (sourceValue === 'user') return '/discover/user'
  return `/discover/${sourceValue}`
}

/** Discover options that filter by category instead of API source. Maps source value → category value. */
export const DISCOVER_SOURCE_TO_CATEGORY = {
  tech_ai: 'Tech & AI',
  politics: 'Politics',
  entertainment: 'Entertainment',
  science: 'Science',
}

/** Map API source (from automated markets) to display source for Discover filter. */
const API_SOURCE_TO_DISPLAY = {
  the_odds_api: 'sports',
  alpha_vantage: 'industry',
  alpha_vantage_trend: 'industry',
  coingecko: 'industry',
  coingecko_trend: 'industry',
  openweathermap: 'global_events',
  weatherapi: 'global_events',
  gnews: 'global_events',
  perigon: 'global_events',
  newsapi_ai: 'global_events',
  newsdata_io: 'global_events',
}

/** Map API source to display category (for Category filter; legacy markets may have category = API source). */
const API_SOURCE_TO_CATEGORY = {
  the_odds_api: 'Sports',
  alpha_vantage: 'Finance',
  alpha_vantage_trend: 'Finance',
  coingecko: 'Crypto',
  coingecko_trend: 'Crypto',
  openweathermap: 'Weather',
  weatherapi: 'Weather',
  gnews: 'News',
  perigon: 'News',
  newsapi_ai: 'News',
  newsdata_io: 'News',
}

/** Map API source to short label for card tag (e.g. "The Odds API", "User-Created"). */
const API_SOURCE_TO_LABEL = {
  the_odds_api: 'The Odds API',
  alpha_vantage: 'Alpha Vantage',
  alpha_vantage_trend: 'Alpha Vantage',
  coingecko: 'CoinGecko',
  coingecko_trend: 'CoinGecko',
  openweathermap: 'OpenWeatherMap',
  weatherapi: 'Weather API',
  gnews: 'GNews',
  perigon: 'Perigon',
  newsapi_ai: 'NewsAPI',
  newsdata_io: 'NewsData.io',
}

/** Normalize payload.source for filtering (so both new display source and legacy API source work). Accepts full payload to support legacy sports (source global_events + category Sports → sports). */
export function sourceForFilter(payloadOrSource) {
  if (payloadOrSource == null) return 'user'
  const payloadSource = typeof payloadOrSource === 'object' ? payloadOrSource?.source : payloadOrSource
  if (!payloadSource) return 'user'
  // Legacy: markets created before sports/global_events split had source 'global_events' and category 'Sports'
  if (typeof payloadOrSource === 'object' && payloadSource === 'global_events' && payloadOrSource?.category === 'Sports') return 'sports'
  return API_SOURCE_TO_DISPLAY[payloadSource] ?? payloadSource
}

/** Keyword hints for inferring category when source/category are missing or legacy. Order matters: first match wins. */
const CATEGORY_KEYWORDS = {
  Sports: [/\b(win|vs\.?|game|match|championship|playoff|score|team|league|nba|nfl|mlb|soccer|football|basketball)\b/i, /\b(odds|spread|over\/under)\b/i],
  Weather: [/\b(rain|snow|temp|temperature|weather|forecast|°C|°F|degrees|celsius|fahrenheit|sunny|storm)\b/i],
  Finance: [/\b(stock|share|S&P|NASDAQ|NYSE|earnings|dividend|trading|above \$|below \$|price target)\b/i],
  Crypto: [/\b(bitcoin|btc|ethereum|eth|crypto|cryptocurrency|coin|token|blockchain)\b/i],
  News: [/\b(headline|top news|breaking|article|coverage)\b/i],
  Politics: [/\b(election|vote|president|congress|senate|bill|policy)\b/i],
  'Tech & AI': [/\b(tech|AI|artificial intelligence|software|startup|coding|algorithm|machine learning|ML|openai|chatgpt|llm|GPT|neural)\b/i],
  Science: [/\b(study|research|experiment|discovery|NASA|space)\b/i],
  Entertainment: [/\b(movie|film|oscar|grammy|celebrity|box office)\b/i],
}

/** Infer category from title + description when no explicit category. Returns null if no match. */
function inferCategoryFromText(title, description) {
  const text = [title, description].filter(Boolean).join(' ')
  if (!text) return null
  for (const [category, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    if (patterns.some(p => p.test(text))) return category
  }
  return null
}

/** Category to use for filter (payload.category may be display category or legacy API source). */
export function categoryForFilter(payload) {
  const cat = payload?.category
  const src = payload?.source || payload?.styleLabel
  if (API_SOURCE_TO_CATEGORY[cat]) return API_SOURCE_TO_CATEGORY[cat]
  if (cat && MARKET_CATEGORIES.some(c => c.value === cat)) return cat
  if (src && API_SOURCE_TO_CATEGORY[src]) return API_SOURCE_TO_CATEGORY[src]
  const inferred = inferCategoryFromText(payload?.title, payload?.description)
  if (inferred) return inferred
  return cat || 'Other'
}

/** Display category for card tag (consistent with filter). */
export function getCategoryDisplay(payload) {
  return categoryForFilter(payload)
}

/** Emoji for each category (for tags and detail UX). */
export const CATEGORY_EMOJI = {
  Sports: '⚽',
  Weather: '🌤️',
  Finance: '📈',
  Crypto: '🪙',
  News: '📰',
  Politics: '🏛️',
  Entertainment: '🎬',
  Science: '🔬',
  'Tech & AI': '🤖',
  Other: '📌',
}

export function getCategoryEmoji(category) {
  if (!category) return CATEGORY_EMOJI.Other
  return CATEGORY_EMOJI[category] || CATEGORY_EMOJI.Other
}

/** Strip redundant "Binary market." prefix and resolution tail from description (handled in How it resolves). */
export function getDisplayDescription(payload) {
  let raw = payload?.description?.trim() || ''
  raw = raw.replace(/^Binary\s+market\.?\s*/i, '').trim() || raw
  // Remove resolution tail so it's not duplicated (Resolves based on... / Yes = ... / Resolved using...)
  raw = raw.replace(/\s+Resolves\s+based on[\s\S]*$/i, '').trim()
  raw = raw.replace(/\s+Yes\s*=[\s\S]*$/i, '').trim()
  raw = raw.replace(/\s+Resolved\s+using[\s\S]*$/i, '').trim()
  return raw || payload?.description?.trim() || ''
}

/** Full article/headline title when stored in oracleConfig (news markets). */
export function getFullArticleTitle(payload) {
  const title = payload?.oracleConfig?.title
  return title && typeof title === 'string' ? title.trim() : null
}

/** Whether this payload looks like a news/top-headline market (has oracleConfig with title or q). */
export function isNewsMarket(payload) {
  const oc = payload?.oracleConfig
  return !!(oc && (oc.title || oc.q))
}

/** Display title for news markets: full article title + date in the question. Uses same calendar date as "Resolves by". */
export function getNewsMarketDisplayTitle(payload) {
  const fullTitle = getFullArticleTitle(payload)
  if (!fullTitle) return null
  const dateStr = payload?.resolutionDeadline || payload?.oracleConfig?.dateStr
  const date = dateStr ? (typeof dateStr === 'string' && dateStr.length >= 10 ? dateStr.slice(0, 10) : null) : null
  const dateLabel = date || 'the resolution date'
  return `Will "${fullTitle}" be in top news on ${dateLabel}?`
}

/** Topic and source for news market meta line (e.g. "Topic: technology · Source: NewsData.io"). */
export function getNewsMarketMeta(payload) {
  if (!isNewsMarket(payload)) return null
  const topic = payload?.oracleConfig?.q || payload?.oracleConfig?.category
  const sourceLabel = getApiSourceLabel(payload)
  if (!sourceLabel || sourceLabel === 'User-Created') return { topic, sourceLabel: null }
  return { topic, sourceLabel }
}

/** Short resolution summary (source + topic/category) for "How it resolves" without repeating full criteria. */
export function getResolutionSummary(payload) {
  const oc = payload?.oracleConfig
  const sourceLabel = getApiSourceLabel(payload)
  if (!sourceLabel || sourceLabel === 'User-Created') return null
  const parts = []
  if (oc?.q) parts.push(`topic: "${oc.q}"`)
  if (oc?.category) parts.push(`category: ${oc.category}`)
  if (parts.length) return `Resolved via ${sourceLabel} (${parts.join(', ')}).`
  return `Resolved via ${sourceLabel}.`
}

/** Short "what you're buying" line for display (from payload.oneLiner or derived from title). */
export function getMarketOneLiner(payload) {
  if (payload?.oneLiner && payload.oneLiner.trim()) return payload.oneLiner.trim()
  const t = payload?.title?.trim()
  if (!t) return 'Outcome of this market.'
  if (t.endsWith('?')) return t
  return t.includes('?') ? t : `${t}?`
}

/** Extract Yes/No outcome summaries from description for resolution section (e.g. "Yes = home wins"). */
export function getResolutionOutcomeSummaries(payload) {
  const desc = payload?.description || ''
  const yesMatch = desc.match(/\bYes\s*=\s*([^.;]+?)(?:\.|;|\s+No\s*=|\s*Resolved|$)/i)
  const noMatch = desc.match(/\bNo\s*=\s*([^.;]+?)(?:\.|;|\s+Data\s|$)/i)
  return {
    yes: yesMatch ? yesMatch[1].trim() : (payload?.marketType === 'Binary' ? 'The condition happens or is true.' : null),
    no: noMatch ? noMatch[1].trim() : (payload?.marketType === 'Binary' ? "The condition doesn't happen or is false." : null),
  }
}

/** API/source label for card tag (e.g. "The Odds API", "User-Created"). */
export function getApiSourceLabel(payload) {
  const src = payload?.source
  if (!src) return 'User-Created'
  return API_SOURCE_TO_LABEL[src] || getSourceLabel(sourceForFilter(src))
}

export function getSourceLabel(value) {
  const s = MARKET_SOURCES.find(x => x.value === value)
  return s ? s.label : value
}

/** Whether the deadline is date-only (YYYY-MM-DD) so we show calendar day without timezone shift. */
function isDateOnlyDeadline(deadline) {
  if (typeof deadline !== 'string') return false
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) return true
  if (/^\d{4}-\d{2}-\d{2}T00:00:00/.test(deadline.trim())) return true
  return false
}

/** Format resolution deadline (ISO or YYYY-MM-DD) for display. Date-only values show calendar day only (no time) to match title. */
export function formatResolutionDeadline(deadline, short = false) {
  if (!deadline) return ''
  try {
    const d = new Date(deadline)
    if (Number.isNaN(d.getTime())) return deadline
    const dateOnly = isDateOnlyDeadline(deadline)
    if (dateOnly) {
      const y = d.getUTCFullYear()
      const m = d.getUTCMonth()
      const day = d.getUTCDate()
      const dateOnlyObj = new Date(Date.UTC(y, m, day))
      if (short) return dateOnlyObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      return dateOnlyObj.toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })
    }
    if (short) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    const hasTime = /T\d{2}:\d{2}/.test(String(deadline).trim()) && !isDateOnlyDeadline(deadline)
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + (hasTime ? ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' }) : '')
  } catch {
    return String(deadline)
  }
}

/** Binary-style variants (all use contract MarketType Binary under the hood) */
export const PREDICTION_STYLES = [
  { value: 'yesNo', label: 'Yes / No', marketType: 'Binary', outcomes: ['Yes', 'No'] },
  { value: 'trueFalse', label: 'True / False', marketType: 'Binary', outcomes: ['True', 'False'] },
  { value: 'happensDoesnt', label: "Happens / Doesn't", marketType: 'Binary', outcomes: ['Happens', "Doesn't"] },
  { value: 'multiOutcome', label: 'Multi-Outcome', marketType: 'MultiOutcome', outcomes: null },
]

export function getStyleByValue(value) {
  return PREDICTION_STYLES.find(s => s.value === value) || PREDICTION_STYLES[0]
}

export function getDefaultOutcomesForStyle(styleValue) {
  const style = getStyleByValue(styleValue)
  return style?.outcomes ? [...style.outcomes] : []
}
