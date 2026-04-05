/**
 * Topic-focused news markets: explicit “feed continuation” rules and matching logic.
 * Markets ask whether the same story thread still surfaces in the API feed used at creation,
 * resolved by re-fetching that feed and comparing headline token overlap (deterministic).
 */

export const FEED_TOPIC_SOURCES = new Set(['gnews', 'perigon', 'newsapi_ai', 'newsdata_io'])

/**
 * After `promoteNewsArticleToOutcomeMarket` + `enrichNewsEvent`, events that still use a raw news
 * API `source` would only become feed-topic continuation markets (not price/FRED/oracle outcomes).
 *
 * Promoted articles switch `source` + `oracleSource` to e.g. `alpha_vantage` / `finnhub` — those must
 * NOT be treated as feed-topic (they are outcome/oracle markets).
 */
export function isFeedTopicOnlyNewsCandidate(ev) {
  if (!ev || ev.customType) return false
  const ocSrc = ev.oracleSource || ev.source
  if (ocSrc && !FEED_TOPIC_SOURCES.has(ocSrc)) return false
  return FEED_TOPIC_SOURCES.has(ev.source)
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out',
  'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way',
  'who', 'boy', 'did', 'let', 'put', 'say', 'she', 'too', 'use', 'that', 'with', 'have', 'this',
  'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very',
  'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than',
  'them', 'well', 'were', 'what', 'year', 'also', 'back', 'only', 'said', 'each', 'which', 'their',
  'about', 'after', 'before', 'being', 'could', 'would', 'should', 'other', 'into', 'more', 'most',
  'through', 'during', 'while', 'where', 'those', 'these', 'says', 'say', 'according', 'report',
  'reports', 'breaking', 'update', 'latest', 'news', 'top', 'headline', 'headlines',
])

function sanitizeHeadline(text, maxLen = null) {
  if (!text || typeof text !== 'string') return ''
  const cleaned = text.replace(/[\x00-\x1f]/g, '').trim()
  return maxLen != null ? cleaned.slice(0, maxLen) : cleaned
}

export function extractSignificantTokens(text) {
  if (!text || typeof text !== 'string') return []
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  return raw.filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

/** Light normalize so "beat"/"beats" align (disclosed in resolution criteria). */
export function normalizeNewsToken(t) {
  const s = String(t).toLowerCase()
  if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1)
  return s
}

/** Distinct topic words from the seed headline (order preserved for storage readability). */
export function uniqueAnchorTokens(headline) {
  const seen = new Set()
  const out = []
  for (const t of extractSignificantTokens(headline)) {
    const n = normalizeNewsToken(t)
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

export function computeMinTokenOverlap(uniqueTokenCount) {
  if (uniqueTokenCount <= 0) return 99
  if (uniqueTokenCount === 1) return 1
  if (uniqueTokenCount === 2) return 2
  return Math.max(2, Math.min(5, Math.ceil(uniqueTokenCount * 0.35)))
}

/** Count of distinct candidate tokens that appear in the anchor set (same normalization as at creation). */
export function overlapSetCount(anchorSet, candidateTitle) {
  const cand = new Set(extractSignificantTokens(candidateTitle).map(normalizeNewsToken))
  let n = 0
  for (const t of cand) {
    if (anchorSet.has(t)) n += 1
  }
  return n
}

export function makeTopicLabel(headline, maxLen = 68) {
  const s = sanitizeHeadline(headline, maxLen + 40)
  if (!s) return 'this story'
  const oneLine = s.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= maxLen) return oneLine
  return `${oneLine.slice(0, maxLen - 1)}…`
}

const PROVIDER_LABEL = {
  gnews: 'GNews',
  perigon: 'Perigon',
  newsapi_ai: 'NewsAPI.ai',
  newsdata_io: 'NewsData.io',
}

/**
 * Replace generic copy with feed-topic market text and full oracleConfig for resolution.
 * Skips events already upgraded by custom-news-markets (election / conflict / olympics).
 */
export function finalizeNewsFeedTopicMarket(ev) {
  if (!ev || ev.customType || !FEED_TOPIC_SOURCES.has(ev.source)) return ev
  const oc = { ...(ev.oracleConfig || {}) }
  const anchorHeadline = sanitizeHeadline(oc.anchorTitle || oc.title || '')
  if (!anchorHeadline) return ev

  const topicLabel = makeTopicLabel(anchorHeadline)
  const anchorTokens = uniqueAnchorTokens(anchorHeadline)
  const minTokenOverlap = computeMinTokenOverlap(anchorTokens.length)
  const resolutionCheckLimit = 20
  const dateStr = oc.dateStr || (typeof ev.endDate === 'string' ? ev.endDate.slice(0, 10) : '')
  if (!dateStr) return ev

  const provider = PROVIDER_LABEL[ev.source] || ev.source
  const seedQuery = oc.seedQuery != null ? String(oc.seedQuery) : ''
  const category = oc.category != null ? String(oc.category) : 'general'

  const feedClause =
    ev.source === 'gnews'
      ? `“${category}” top-headlines (English)`
      : `“${seedQuery || 'technology'}” search results (English)`

  const title = `Will an article title similar to “${topicLabel}” still appear in ${provider} ${feedClause} by end of ${dateStr} (UTC)?`
  const safeTitle = title.length > 158 ? `${title.slice(0, 155)}…` : title

  const description =
    `Binary, rule-based market: Yes if, by end of ${dateStr} UTC, the ${provider} API (same parameters as stored) returns at least one article whose title overlaps the seed headline by the token rule in the resolution criteria; otherwise No. ` +
    `“Similar” means the deterministic token-overlap count in the criteria—not editorial judgment. Anchor text: “${topicLabel}”.`

  const resolutionCriteria =
    `Automated resolution after end of calendar day ${dateStr} (UTC). ` +
    `(1) The platform re-calls the same ${provider} API used at creation with the same parameters stored in oracleConfig ` +
    `(GNews: category “${category}”; others: keyword “${seedQuery || 'technology'}”), requesting up to ${resolutionCheckLimit} articles. ` +
    `(2) Yes if any returned article title shares at least ${minTokenOverlap} distinct significant tokens with the seed headline’s word set ` +
    `(lowercase, punctuation stripped, English stopwords removed, minimum length 3; trailing “s” dropped on tokens longer than 3 characters for matching). ` +
    `(3) No if no title meets that threshold. ` +
    `(4) If the API errors, the market stays open until a later resolution run succeeds.`

  const oneLiner =
    `Yes if any returned article title meets the ${minTokenOverlap}+ token overlap with the seed; otherwise No.`

  return {
    ...ev,
    title: safeTitle,
    description,
    resolutionCriteria,
    oneLiner,
    oracleConfig: {
      ...oc,
      newsResolutionMode: 'feed_topic_continuation',
      anchorTitle: anchorHeadline,
      anchorTokens,
      minTokenOverlap,
      resolutionCheckLimit,
      dateStr,
      ...(ev.source === 'gnews'
        ? { category }
        : { seedQuery: seedQuery || oc.seedQuery || 'technology' }),
    },
  }
}
