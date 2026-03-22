/**
 * Cross-market dedupe for auto-seed: same logical outcome + same resolution date + same
 * outcome options → one contract. Uses oracle-specific keys when available, then a general
 * text fingerprint (normalized title + criteria + settlement summary).
 */

/** @param {string | null | undefined} iso */
export function resolutionMonthKey(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const m = iso.match(/^(\d{4}-\d{2})/)
  return m ? m[1] : ''
}

/** Unify old slugs with current canonical Middle East bucket. */
export function normalizeConflictSlug(slug) {
  if (!slug || typeof slug !== 'string') return slug
  if (slug === 'israel-hamas-gaza') return 'middle-east-hostilities'
  return slug
}

/**
 * Infer YYYY-MM from title patterns like "end by 2026-09" or "by 2026-09-30".
 * @param {string} title
 */
function conflictYmFromTitle(title) {
  const t = String(title || '')
  let m = t.match(/\bend by (\d{4}-\d{2})\b/i)
  if (m) return m[1]
  m = t.match(/\bby (\d{4}-\d{2}-\d{2})\b/i)
  if (m) return m[1].slice(0, 7)
  m = t.match(/\b(\d{4}-\d{2})-\d{2}-\d{2}\b/)
  return m ? m[1] : ''
}

/**
 * Legacy / title-only: Middle East–adjacent war headlines share one dedupe lane per month.
 * @param {string} title
 * @param {string} ym
 * @returns {string | null}
 */
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'per',
  'the',
  'this',
  'that',
  'to',
  'vs',
  'versus',
  'was',
  'were',
  'will',
  'with',
  'any',
])

/** FNV-1a 32-bit hex — stable in Workers without crypto.subtle. */
function fnv1a32Hex(s) {
  let h = 2166136261
  const str = String(s)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * Word-order invariant fingerprint: unique significant tokens, sorted.
 * Keeps digits and $ for price-style markets.
 */
export function normalizeForOutcomeFingerprint(text) {
  const raw = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9$%.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const seen = new Set()
  const out = []
  for (const w of raw) {
    if (w.length < 2 && !/^\d/.test(w)) continue
    if (STOPWORDS.has(w)) continue
    if (seen.has(w)) continue
    seen.add(w)
    out.push(w)
  }
  out.sort()
  return out.join(' ')
}

function resolutionDateKey(p) {
  const rd = p.resolutionDeadline
  if (typeof rd === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rd)) return rd.slice(0, 10)
  if (p.endDate != null && String(p.endDate).length >= 10) return String(p.endDate).slice(0, 10)
  const oc = p.oracleConfig && typeof p.oracleConfig === 'object' ? p.oracleConfig : {}
  const ocEnd = oc.endDate
  if (typeof ocEnd === 'string' && ocEnd.length >= 10) return ocEnd.slice(0, 10)
  const rd2 = oc.reportDate
  if (typeof rd2 === 'string' && rd2.length >= 10) return rd2.slice(0, 10)
  return ''
}

function outcomesFingerprint(p) {
  const arr =
    Array.isArray(p.outcomes) && p.outcomes.length > 0
      ? p.outcomes.map((x) => String(x).toLowerCase().trim())
      : ['yes', 'no']
  const u = [...new Set(arr)].filter(Boolean)
  u.sort()
  return u.join('|')
}

function inferMiddleEastConflictDedupeKey(title, ym) {
  if (!ym) return null
  const t = String(title || '').toLowerCase()
  const regionKw =
    /\b(middle\s+east|gaza|hamas|israel|palestin|hezbollah|lebanon|idf|west\s+bank|jerusalem|tel\s+aviv|yemen|houthi|red\s+sea)\b/.test(
      t
    )
  const warKw =
    /\b(war|conflict|strike|ceasefire|attack|hostilit|missile|invasion|troops|bombing|bomb|hostilities)\b/.test(t)
  if (regionKw && warKw) return `conflict:middle-east-hostilities:${ym}`
  if ((/\bgaza\b/.test(t) || /\bhamas\b/.test(t) || /\bisrael-hamas\b/.test(t)) && /\bend by\b/.test(t)) {
    return `conflict:middle-east-hostilities:${ym}`
  }
  if (/\biran\b/.test(t) && warKw && !/\b(israel|gaza|hamas)\b/.test(t)) return `conflict:iran:${ym}`
  return null
}

/**
 * Build dedupe key from stored or candidate payload (does not read oracleConfig.dedupeKey).
 * @param {Record<string, unknown>} payload
 * @returns {string | null}
 */
export function buildDedupeKeyFromPayload(payload) {
  const p = payload && typeof payload === 'object' ? payload : {}
  const oc = /** @type {Record<string, unknown>} */ (p.oracleConfig && typeof p.oracleConfig === 'object' ? p.oracleConfig : {})
  const mk = resolutionMonthKey(/** @type {string} */ (p.resolutionDeadline))

  if (oc.customType === 'conflict' && oc.conflictSlug && oc.conflictDeadlineYm) {
    const slug = normalizeConflictSlug(String(oc.conflictSlug))
    return `conflict:${slug}:${String(oc.conflictDeadlineYm).slice(0, 7)}`
  }

  if (typeof oc.customType === 'string' && oc.operatorDedupeYm) {
    return `op:${oc.customType}:${String(oc.operatorDedupeYm).slice(0, 7)}`
  }

  if (oc.customType === 'election' && oc.electionYear != null && oc.electionTier && oc.electionEntitySlug) {
    return `election:${oc.electionYear}:${oc.electionTier}:${oc.electionEntitySlug}`
  }

  if (oc.customType === 'olympics' && oc.olympicsYear != null && oc.olympicsSubtopic) {
    return `olympics:${oc.olympicsYear}:${oc.olympicsSubtopic}`
  }

  if (oc.outcomeResolutionKind === 'earnings_beat' && oc.finnhubSymbol && oc.year != null && oc.quarter != null && oc.reportDate) {
    const eps = oc.epsEstimate != null ? String(oc.epsEstimate) : 'x'
    return `earn:${oc.finnhubSymbol}:${oc.year}:Q${oc.quarter}:${String(oc.reportDate).slice(0, 10)}:${eps}`
  }

  if (oc.outcomeResolutionKind === 'macro_fred' && oc.seriesId && oc.endDate && oc.comparator != null && oc.threshold != null) {
    return `fred:${oc.seriesId}:${String(oc.endDate).slice(0, 10)}:${oc.comparator}:${oc.threshold}`
  }

  if (oc.outcomeResolutionKind === 'price_feed' && oc.endDate && oc.comparator != null && oc.threshold != null) {
    if (oc.coinId) return `crypto:${oc.coinId}:${String(oc.endDate).slice(0, 10)}:${oc.comparator}:${oc.threshold}`
    if (oc.symbol) return `price:${oc.symbol}:${String(oc.endDate).slice(0, 10)}:${oc.comparator}:${oc.threshold}`
  }

  const title = String(p.title || '')
  const ymFromTitle = conflictYmFromTitle(title)
  const ym = ymFromTitle || mk
  const legacy = inferMiddleEastConflictDedupeKey(title, ym)
  if (legacy) return legacy

  // Feed-topic markets are anchored to a specific headline thread; do not collapse by text fingerprint.
  if (oc.newsResolutionMode === 'feed_topic_continuation') return null

  const rd = resolutionDateKey(p)
  const titleTrim = String(p.title || '').trim()
  if (!rd || rd.length < 10 || titleTrim.length < 10) return null

  const crit = String(p.resolutionCriteria || '')
  const st = p.settlementTrigger
  const settle =
    st && typeof st === 'object' && st !== null && 'value' in st ? String(/** @type {{ value?: string }} */ (st).value || '') : ''

  const bundle = normalizeForOutcomeFingerprint(`${titleTrim} ${crit} ${settle}`)
  if (bundle.length < 12) return null

  const outcomesFp = outcomesFingerprint(p)
  const h = fnv1a32Hex(bundle)
  return `out:${outcomesFp}:${rd}:${h}`
}

/**
 * Prefer stored dedupeKey on payload, else derive.
 * @param {Record<string, unknown>} payload
 */
export function computeDedupeKeyFromPayload(payload) {
  const existing = payload?.oracleConfig?.dedupeKey
  if (typeof existing === 'string' && existing.length > 1) return existing
  return buildDedupeKeyFromPayload(payload)
}

/**
 * Attach dedupeKey to payload.oracleConfig for future scans.
 * @param {Record<string, unknown>} payload
 * @returns {string | null}
 */
export function assignDedupeKeyToPayload(payload) {
  if (!payload || typeof payload !== 'object') return null
  const key = buildDedupeKeyFromPayload(payload)
  if (!key) return null
  const oc = { ...(payload.oracleConfig && typeof payload.oracleConfig === 'object' ? payload.oracleConfig : {}), dedupeKey: key }
  payload.oracleConfig = oc
  return key
}

/**
 * @param {Array<{ payload?: Record<string, unknown> }>} rows
 * @returns {Set<string>}
 */
export function dedupeKeySetFromVirtualMarketRows(rows) {
  const s = new Set()
  for (const r of rows || []) {
    const k = computeDedupeKeyFromPayload(r.payload || {})
    if (k) s.add(k)
  }
  return s
}
