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
  { value: 'Other', label: 'Other' },
]

/** Market sources: automated (global events, industry, VR) vs user-created. Labels match what each category contains. */
export const MARKET_SOURCES = [
  { value: 'all', label: 'All Markets' },
  { value: 'active', label: 'With volume' },
  { value: 'global_events', label: 'Sports, Weather & News' },
  { value: 'industry', label: 'Finance & Crypto' },
  { value: 'virtual_realities', label: 'Virtual Realities' },
  { value: 'user', label: 'User-Created' },
]

/** Map API source (from automated markets) to display source for Discover filter. */
const API_SOURCE_TO_DISPLAY = {
  the_odds_api: 'global_events',
  alpha_vantage: 'industry',
  alpha_vantage_trend: 'industry',
  coingecko: 'industry',
  coingecko_trend: 'industry',
  openweathermap: 'global_events',
  weatherapi: 'global_events',
  gnews: 'global_events',
  perigon: 'global_events',
  newsapi_ai: 'global_events',
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
}

/** Normalize payload.source for filtering (so both new display source and legacy API source work). */
export function sourceForFilter(payloadSource) {
  if (!payloadSource) return 'user'
  return API_SOURCE_TO_DISPLAY[payloadSource] ?? payloadSource
}

/** Category to use for filter (payload.category may be display category or legacy API source). */
export function categoryForFilter(payload) {
  const cat = payload?.category
  const src = payload?.source || payload?.styleLabel
  if (API_SOURCE_TO_CATEGORY[cat]) return API_SOURCE_TO_CATEGORY[cat]
  if (cat && MARKET_CATEGORIES.some(c => c.value === cat)) return cat
  if (src && API_SOURCE_TO_CATEGORY[src]) return API_SOURCE_TO_CATEGORY[src]
  return cat || 'Other'
}

/** Display category for card tag (consistent with filter). */
export function getCategoryDisplay(payload) {
  return categoryForFilter(payload)
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
