/**
 * Market categories and prediction styles for the platform.
 * Used for filtering/browsing discover routes and market lists.
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
  operator_manual: 'global_events',
  fred: 'industry',
  finnhub: 'industry',
  frankfurter: 'industry',
  forex: 'industry',
  usgs: 'global_events',
  fec: 'global_events',
  openfec: 'global_events',
  nasa_neo: 'global_events',
  congress_gov: 'global_events',
  bls: 'industry',
  massive: 'industry',
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
  operator_manual: 'News',
  fred: 'Finance',
  finnhub: 'Finance',
  frankfurter: 'Finance',
  forex: 'Finance',
  usgs: 'Science',
  fec: 'Politics',
  openfec: 'Politics',
  nasa_neo: 'Science',
  congress_gov: 'Politics',
  bls: 'Finance',
  massive: 'Finance',
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
  operator_manual: 'Operator (manual)',
  fred: 'FRED',
  finnhub: 'Finnhub',
  frankfurter: 'Frankfurter (ECB)',
  forex: 'Frankfurter (ECB)',
  usgs: 'USGS',
  fec: 'OpenFEC',
  openfec: 'OpenFEC',
  nasa_neo: 'NASA NeoWs',
  congress_gov: 'Congress.gov',
  bls: 'BLS',
  massive: 'Massive',
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

/** Map news topic (oracleConfig.q or category) to display category so news markets show under Tech & AI, Politics, etc. */
const NEWS_TOPIC_TO_CATEGORY = {
  technology: 'Tech & AI',
  tech: 'Tech & AI',
  politics: 'Politics',
  election: 'Politics',
  science: 'Science',
  entertainment: 'Entertainment',
  business: 'Finance',
  finance: 'Finance',
  health: 'Science',
  sports: 'Sports',
  world: 'News',
  general: 'News',
}
function categoryFromNewsTopic(topic) {
  if (!topic || typeof topic !== 'string') return null
  const key = topic.toLowerCase().trim()
  return NEWS_TOPIC_TO_CATEGORY[key] ?? null
}

/** Keyword hints for inferring category when source/category are missing or legacy. Order matters: first match wins. */
const CATEGORY_KEYWORDS = {
  Sports: [/\b(win|vs\.?|game|match|championship|playoff|score|team|league|nba|nfl|mlb|soccer|football|basketball)\b/i, /\b(odds|spread|over\/under)\b/i],
  Weather: [/\b(rain|snow|temp|temperature|weather|forecast|°C|°F|degrees|celsius|fahrenheit|sunny|storm)\b/i],
  Finance: [/\b(stock|share|S&P|NASDAQ|NYSE|earnings|dividend|trading|above \$|below \$|price target)\b/i],
  Crypto: [/\b(bitcoin|btc|ethereum|eth|crypto|cryptocurrency|coin|token|blockchain)\b/i],
  News: [/\b(headline|top news|breaking|article|coverage|still appear|news feed|topic signature)\b/i],
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
  const topicCat = categoryFromNewsTopic(
    payload?.oracleConfig?.q || payload?.oracleConfig?.category || payload?.oracleConfig?.seedQuery
  )
  if (topicCat) return topicCat
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
  return !!(oc && (oc.title || oc.q || oc.seedQuery || oc.category || oc.newsResolutionMode))
}

/**
 * Legacy news markets used a synthetic display title. Feed-topic markets store the real question on payload.title.
 */
export function getNewsMarketDisplayTitle(payload) {
  if (payload?.oracleConfig?.newsResolutionMode === 'feed_topic_continuation') return null
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
  const topic = payload?.oracleConfig?.q || payload?.oracleConfig?.seedQuery || payload?.oracleConfig?.category
  const sourceLabel = getApiSourceLabel(payload)
  if (!sourceLabel || sourceLabel === 'User-Created') return { topic, sourceLabel: null }
  return { topic, sourceLabel }
}

/** Short resolution summary (source + topic/category) for "How it resolves" without repeating full criteria. */
export function getResolutionSummary(payload) {
  const oc = payload?.oracleConfig
  const sourceLabel = getApiSourceLabel(payload)
  if (!sourceLabel || sourceLabel === 'User-Created') return null
  if (oc?.outcomeResolutionKind === 'operator_manual') {
    if (oc?.customType) {
      return `Automated at resolution time: news search and headline heuristics for this topic type; if the outcome is still unclear, the market is voided and stakes refunded.`
    }
    return `Outcome-based market: use published criteria; resolution may be manual unless automated rules are enabled.`
  }
  if (oc?.outcomeResolutionKind === 'forex_ecb' && oc.base && oc.quote && oc.threshold != null && oc.endDate) {
    return `ECB via Frankfurter: Yes if ${oc.base}/${oc.quote} on or before ${oc.endDate} is ≥ ${oc.threshold}.`
  }
  if (oc?.outcomeResolutionKind === 'usgs_count') {
    return `USGS: Yes if earthquake count M≥${oc.minMagnitude ?? 5} in window is ≥ ${oc.minCount}.`
  }
  if (oc?.outcomeResolutionKind === 'fec_presidential_lead' && oc.leaderName) {
    return `OpenFEC: Yes if ${oc.leaderName} still leads presidential receipts for ${oc.fecElectionYear} at resolution.`
  }
  if (oc?.outcomeResolutionKind === 'nasa_neo_count') {
    return `NASA NeoWs: Yes if element_count ≥ ${oc.neoMinCount} for the stored date range.`
  }
  if (oc?.outcomeResolutionKind === 'bls_cpi' && oc.thresholdIndex != null && oc.endDate) {
    return `BLS ${oc.blsSeriesId || 'CPI'}: Yes if latest print on or before ${oc.endDate} is ≥ index ${oc.thresholdIndex}.`
  }
  if (oc?.outcomeResolutionKind === 'congress_feed_count' && oc.minBillCount != null && oc.congress != null) {
    return `Congress.gov: Yes if the same bill list query for the ${oc.congress}th Congress still returns ≥ ${oc.minBillCount} bills on the first page.`
  }
  if (oc?.outcomeResolutionKind === 'macro_fred' && oc.threshold != null && oc.endDate) {
    const comp = oc.comparator === 'lte' ? '≤' : '≥'
    return `FRED ${oc.seriesId || 'DFF'}: Yes if last print on or before ${oc.endDate} is ${comp} ${oc.threshold}%.`
  }
  if (oc?.outcomeResolutionKind === 'earnings_beat' && oc.finnhubSymbol && oc.epsEstimate != null) {
    return `Finnhub: Yes if reported EPS for ${oc.finnhubSymbol} Q${oc.quarter} ${oc.year} ≥ $${Number(oc.epsEstimate).toFixed(2)}.`
  }
  if (oc?.outcomeResolutionKind === 'price_feed' && (oc.threshold != null || oc.endDate)) {
    const comp = oc.comparator === 'lte' ? 'at or below' : 'at or above'
    const day = oc.endDate || 'settlement'
    return `Price oracle: after UTC end of ${day}, Yes if the feed price is ${comp} $${oc.threshold} (see full criteria for provider + field).`
  }
  if (oc?.newsResolutionMode === 'feed_topic_continuation') {
    return `Automated: re-fetch the same ${sourceLabel} feed as at creation; Yes if any headline meets the stored token-overlap threshold (see criteria).`
  }
  const parts = []
  if (oc?.q) parts.push(`topic: "${oc.q}"`)
  if (oc?.seedQuery) parts.push(`query: "${oc.seedQuery}"`)
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

/** True when the one-liner adds information beyond the title (avoids duplicate lines on cards). */
export function oneLinerAddsBeyondTitle(title, oneLiner) {
  const norm = (s) =>
    (s || '')
      .trim()
      .replace(/\?+\s*$/u, '')
      .replace(/\s+/gu, ' ')
      .toLowerCase()
  return norm(oneLiner) !== '' && norm(oneLiner) !== norm(title)
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
  const oracleKey = payload?.oracleSource || payload?.styleLabel
  if (oracleKey && API_SOURCE_TO_LABEL[oracleKey]) return API_SOURCE_TO_LABEL[oracleKey]
  const src = payload?.source
  if (!src) return 'User-Created'
  return API_SOURCE_TO_LABEL[src] || getSourceLabel(sourceForFilter(src))
}

/** Map a stored backend source/oracle key to a product label, or null if it is a discover bucket / unknown. */
function resolveApiProviderLabel(key) {
  if (key == null || key === '') return null
  const k = String(key).trim()
  return API_SOURCE_TO_LABEL[k] || null
}

/**
 * Labels for which data feed/API seeded the market vs which powers resolution.
 * Creation uses oracleConfig.seedNewsSource (news) when present, else styleLabel/source when they are API keys.
 */
export function getMarketApiAttribution(payload) {
  const oc = payload?.oracleConfig || {}

  let resolution = resolveApiProviderLabel(payload?.oracleSource)
  if (!resolution && payload?.oracleSource) {
    resolution = String(payload.oracleSource).replace(/_/g, ' ')
  }
  if (!resolution) resolution = resolveApiProviderLabel(payload?.styleLabel)
  if (!resolution) resolution = resolveApiProviderLabel(payload?.source)
  if (!resolution) resolution = getApiSourceLabel(payload)

  let creation = resolveApiProviderLabel(oc.seedNewsSource)
  if (!creation) creation = resolveApiProviderLabel(payload?.styleLabel)
  if (!creation) creation = resolveApiProviderLabel(payload?.source)
  if (!creation) creation = resolution
  if (!creation) creation = getApiSourceLabel(payload)

  return {
    creation,
    resolution,
    same: creation === resolution,
  }
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

/** Backend uses …T23:59:59.000Z as “end of UTC calendar day” for many oracles — show that clearly, not a confusing local time. */
function isUtcCalendarDayEnd(deadline) {
  const s = String(deadline).trim()
  return /T23:59:59(\.000)?Z$/i.test(s)
}

/** Format resolution deadline (ISO or YYYY-MM-DD) for display. Date-only values show calendar day only (no time) to match title. */
export function formatResolutionDeadline(deadline, short = false) {
  if (!deadline) return ''
  try {
    const d = new Date(deadline)
    if (Number.isNaN(d.getTime())) return deadline
    if (isUtcCalendarDayEnd(deadline)) {
      const label = d.toLocaleDateString(undefined, {
        ...(short
          ? { month: 'short', day: 'numeric', year: 'numeric' }
          : { dateStyle: 'medium' }),
        timeZone: 'UTC',
      })
      return short ? `${label} · 23:59 UTC` : `End of ${label} (23:59 UTC, calendar day)`
    }
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

/** Milliseconds since epoch for resolution, or null if missing/invalid. */
export function getResolutionDeadlineMs(payload) {
  const raw = payload?.resolutionDeadline
  if (!raw) return null
  const t = new Date(raw).getTime()
  return Number.isNaN(t) ? null : t
}

/** One-line deadline for cards and previews (matches short `formatResolutionDeadline`). */
export function getCardResolutionLine(payload) {
  const dl = payload?.resolutionDeadline
  if (!dl) return ''
  return `Resolves by ${formatResolutionDeadline(dl, true)}`
}

function tokenizeTitle(title) {
  if (!title || typeof title !== 'string') return []
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

/**
 * Related markets by title token overlap. `candidates` are list rows like `{ contractId, payload }`.
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

/**
 * Heuristic liquidity / data confidence for UX badges (not financial advice).
 */
export function getMarketDataConfidence(payload, openOrderCount = 0) {
  const vol = parseFloat(payload?.totalVolume) || 0
  const orders = openOrderCount || 0
  if (vol < 5 && orders < 2) {
    return {
      level: 'thin',
      label: 'Thin activity',
      hint: 'Few trades so far — prices can move quickly on small orders.',
    }
  }
  if (vol < 25 && orders < 1) {
    return {
      level: 'medium',
      label: 'Limited book',
      hint: 'Light volume — check open orders before sizing up.',
    }
  }
  return { level: 'solid', label: null, hint: null }
}

/** Short line explaining why automated (or user) markets exist on the platform. */
export function getWhyMarketExistsLine(payload) {
  const api = getApiSourceLabel(payload)
  if (api === 'User-Created') {
    return 'This market was created by a community member. Read how it resolves before trading.'
  }
  const bucket = getSourceLabel(sourceForFilter(payload))
  return `Opened automatically from real-world feeds (${bucket} · ${api}) so the question and deadline stay tied to observable data.`
}

/** Plain-language bullets for an expandable “in simple terms” block (detail page). */
export function getPlainEnglishResolution(payload) {
  const lines = []
  const dl = payload?.resolutionDeadline
  if (dl) {
    lines.push(
      `After ${formatResolutionDeadline(dl)}, new trades stop and the outcome is decided using the rule below (or the exact criteria if you expand it).`
    )
  }
  const sum = getResolutionSummary(payload)
  if (sum) {
    lines.push(`In short: ${sum}`)
  }
  const { yes, no } = getResolutionOutcomeSummaries(payload)
  if (payload?.marketType === 'Binary' && yes && no) {
    lines.push(`Yes pays if: ${yes}`)
    lines.push(`No pays if: ${no}`)
  }
  return lines
}

/** Meta / Open Graph description for share previews. */
export function buildMarketShareDescription(payload) {
  const title = (payload?.title || 'Prediction market').trim()
  const shortTitle = title.length > 140 ? `${title.slice(0, 137)}…` : title
  const dl = payload?.resolutionDeadline
    ? ` Resolves ${formatResolutionDeadline(payload.resolutionDeadline, true)}.`
    : ''
  const sum = getResolutionSummary(payload)
  const extra = sum ? ` ${sum.replace(/\s+/g, ' ')}` : ''
  let out = `${shortTitle}.${dl}${extra}`.trim()
  if (out.length > 300) out = `${out.slice(0, 297)}…`
  return out
}

/** Binary-style variants (Binary) and multi-outcome (AMM order book; pool is Yes/No only for Binary). */
export const PREDICTION_STYLES = [
  { value: 'yesNo', label: 'Yes / No', marketType: 'Binary', outcomes: ['Yes', 'No'] },
  { value: 'trueFalse', label: 'True / False', marketType: 'Binary', outcomes: ['True', 'False'] },
  { value: 'happensDoesnt', label: "Happens / Doesn't", marketType: 'Binary', outcomes: ['Happens', "Doesn't"] },
  { value: 'conditional', label: 'Conditional (Yes/No)', marketType: 'Binary', outcomes: ['Yes', 'No'] },
  { value: 'multiOutcome', label: 'Multi-Outcome', marketType: 'MultiOutcome', outcomes: null },
  {
    value: 'scalarBuckets',
    label: 'Scalar (range buckets)',
    marketType: 'MultiOutcome',
    outcomes: null,
  },
]

export function getStyleByValue(value) {
  return PREDICTION_STYLES.find(s => s.value === value) || PREDICTION_STYLES[0]
}

export function getDefaultOutcomesForStyle(styleValue) {
  const style = getStyleByValue(styleValue)
  return style?.outcomes ? [...style.outcomes] : []
}
