/**
 * Cross-market dedupe for auto-seed: same logical outcome + resolution time + outcomes → one contract.
 * - Oracle-specific keys (conflict, FRED, prices, …) when available
 * - General: out2:{outcomes}:{instant}:{sha256} + legacy out:{outcomes}:{date}:{fnv} for DB migration
 * - Semantic: unigram + word-bigram Jaccard, overlap coefficient (same calendar day + outcomes)
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

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'being',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'per',
  'than',
  'the',
  'this',
  'that',
  'these',
  'those',
  'to',
  'vs',
  'versus',
  'was',
  'were',
  'will',
  'with',
  'any',
  'not',
  'no',
  'yes',
  'also',
  'just',
  'only',
  'about',
  'over',
  'such',
  'some',
])

/** Multi-word and phrase normalization (order: longest / most specific first). */
const PHRASE_SYNONYMS = [
  [/\bunited states of america\b/gi, ' usa '],
  [/\bu\.?\s*s\.?\s*a\.?\b/gi, ' usa '],
  [/\bunited states\b/gi, ' usa '],
  [/\bwhite house\b/gi, ' whitehouse '],
  [/\bfederal reserve\b/gi, ' fedreserve '],
  [/\bfomc\b/gi, ' fedreserve '],
  [/\binterest rates?\b/gi, ' interestrate '],
  [/\bprime minister\b/gi, ' primeminister '],
  [/\bstock market\b/gi, ' stockmarket '],
  [/\bmiddle east\b/gi, ' middleeast '],
  [/\bnorth korea\b/gi, ' northkorea '],
  [/\bsouth korea\b/gi, ' southkorea '],
  [/\bsaudi arabia\b/gi, ' saudiarabia '],
  [/\bnew york\b/gi, ' newyork '],
  [/\bwall street\b/gi, ' wallstreet '],
  [/\bchief executive\b/gi, ' ceo '],
  [/\bartificial intelligence\b/gi, ' ai '],
  [/\bcease[- ]?fire\b/gi, ' ceasefire '],
  [/\bpeace (talk|deal|plan)s?\b/gi, ' peacedeal '],
  [/\bs&p\s*500\b/gi, ' sp500 '],
  [/\bs\s*&\s*p\b/gi, ' sp500 '],
  [/\bnasdaq\b/gi, ' nasdaq '],
  [/\bdow jones\b/gi, ' dowjones '],
  [/\bconsumer price index\b/gi, ' cpi '],
  [/\bgross domestic product\b/gi, ' gdp '],
  [/\bnon[- ]?farm payrolls?\b/gi, ' nfp '],
  [/\binitial public offering\b/gi, ' ipo '],
  [/\bgoing public\b/gi, ' ipo '],
  [/\bclimate change\b/gi, ' climatechange '],
]

const TOKEN_ALIASES = new Map([
  ['u.s.', 'usa'],
  ['us', 'usa'],
  ['american', 'usa'],
  ['americans', 'usa'],
  ['btc', 'bitcoin'],
  ['eth', 'ethereum'],
])

/** Normalize money and dates so "by $200" / "by 200 dollars" / "2026-03-15" align. */
function canonNumericAndDates(text) {
  let t = String(text || '').toLowerCase()
  t = t.replace(/\$[\d,]+(?:\.\d+)?\b/g, (m) => {
    const n = m.replace(/[$,]/g, '').replace(/\./g, 'p')
    return ` cur${n} `
  })
  t = t.replace(/\b(\d+)\s+dollars?\b/g, ' cur$1 ')
  t = t.replace(/\b(20\d{2})-(\d{2})-(\d{2})\b/g, ' d$1$2$3 ')
  t = t.replace(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/g, (_, a, b, y) => {
    const mm = String(a).padStart(2, '0')
    const dd = String(b).padStart(2, '0')
    return ` d${y}${mm}${dd} `
  })
  return t
}

function applyPhraseSynonyms(text) {
  let s = String(text || '').toLowerCase()
  for (const [re, rep] of PHRASE_SYNONYMS) s = s.replace(re, rep)
  return s
}

function lightStem(w) {
  if (w.length <= 2) return w
  if (w.length > 5 && w.endsWith('ies')) return `${w.slice(0, -3)}y`
  if (w.length > 4 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 4 && (w.endsWith('ed') || w.endsWith('es'))) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

function aliasToken(w) {
  return TOKEN_ALIASES.get(w) || w
}

/**
 * Legacy token pipeline (no phrases / stem / aliases) — matches older out:…fnv keys in DB.
 */
export function normalizeForOutcomeFingerprintLegacy(text) {
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

/**
 * Word-order invariant fingerprint: phrases → tokens → aliases → stem → unique → sort.
 */
export function normalizeForOutcomeFingerprint(text) {
  const afterCanon = canonNumericAndDates(text)
  const afterPhrase = applyPhraseSynonyms(afterCanon)
  const raw = afterPhrase
    .replace(/[^a-z0-9$%.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const seen = new Set()
  const out = []
  for (let w of raw) {
    w = aliasToken(w)
    w = lightStem(w)
    if (w.length < 2 && !/^\d/.test(w)) continue
    if (STOPWORDS.has(w)) continue
    if (seen.has(w)) continue
    seen.add(w)
    out.push(w)
  }
  out.sort()
  return out.join(' ')
}

/** @param {Record<string, unknown>} p */
export function outcomeTextBundle(p) {
  const titleTrim = String(p.title || '').trim()
  const crit = String(p.resolutionCriteria || '')
  const st = p.settlementTrigger
  const settle =
    st && typeof st === 'object' && st !== null && 'value' in st ? String(/** @type {{ value?: string }} */ (st).value || '') : ''
  return `${titleTrim} ${crit} ${settle}`
}

export function isFeedTopicPayload(p) {
  const oc = p?.oracleConfig && typeof p.oracleConfig === 'object' ? p.oracleConfig : {}
  return oc.newsResolutionMode === 'feed_topic_continuation'
}

function conflictYmFromTitle(title) {
  const t = String(title || '')
  let m = t.match(/\bend by (\d{4}-\d{2})\b/i)
  if (m) return m[1]
  m = t.match(/\bby (\d{4}-\d{2}-\d{2})\b/i)
  if (m) return m[1].slice(0, 7)
  m = t.match(/\b(\d{4}-\d{2})-\d{2}-\d{2}\b/)
  return m ? m[1] : ''
}

function fnv1a32Hex(s) {
  let h = 2166136261
  const str = String(s)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** First n bytes of SHA-256 as hex (default 16 bytes = 128-bit prefix). */
async function sha256HexPrefix(text, byteLen = 16) {
  const enc = new TextEncoder()
  const buf = enc.encode(text)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  const slice = new Uint8Array(hash).slice(0, byteLen)
  let hex = ''
  for (let i = 0; i < slice.length; i++) hex += slice[i].toString(16).padStart(2, '0')
  return hex
}

export function resolutionDateKey(p) {
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

/**
 * UTC minute bucket for resolution (finer than calendar day only).
 * Date-only deadlines normalize to …T00:00 (UTC start of that local calendar day in stored ISO).
 */
export function resolutionInstantKey(p) {
  const raw = p.resolutionDeadline
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 16)
  }
  const d = resolutionDateKey(p)
  return d && d.length >= 10 ? `${d}T00:00` : ''
}

export function outcomesFingerprint(p) {
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
 * Legacy generic key (date + FNV + old normalize) — matches pre–out2 rows without stored dedupeKey.
 * @param {Record<string, unknown>} payload
 * @returns {string | null}
 */
export function legacyGenericDedupeKey(payload) {
  const p = payload && typeof payload === 'object' ? payload : {}
  const oc = /** @type {Record<string, unknown>} */ (p.oracleConfig && typeof p.oracleConfig === 'object' ? p.oracleConfig : {})
  if (isFeedTopicPayload(p)) return null
  if (oc.customType === 'conflict' || oc.customType === 'election' || oc.customType === 'olympics') return null
  if (typeof oc.customType === 'string' && oc.operatorDedupeYm) return null
  if (oc.outcomeResolutionKind === 'earnings_beat' || oc.outcomeResolutionKind === 'macro_fred' || oc.outcomeResolutionKind === 'price_feed')
    return null

  const rd = resolutionDateKey(p)
  const titleTrim = String(p.title || '').trim()
  if (!rd || rd.length < 10 || titleTrim.length < 10) return null

  const bundle = normalizeForOutcomeFingerprintLegacy(outcomeTextBundle(p))
  if (bundle.length < 12) return null
  const outcomesFp = outcomesFingerprint(p)
  return `out:${outcomesFp}:${rd}:${fnv1a32Hex(bundle)}`
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function buildDedupeKeyFromPayload(payload) {
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

  if (isFeedTopicPayload(p)) return null

  const instant = resolutionInstantKey(p)
  const titleTrim = String(p.title || '').trim()
  if (!instant || instant.length < 10 || titleTrim.length < 10) return null

  const bundle = normalizeForOutcomeFingerprint(outcomeTextBundle(p))
  if (bundle.length < 12) return null

  const outcomesFp = outcomesFingerprint(p)
  const hashInput = `${outcomesFp}\n${instant}\n${bundle}`
  const h = await sha256HexPrefix(hashInput, 16)
  return `out2:${outcomesFp}:${instant}:${h}`
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function computeDedupeKeyFromPayload(payload) {
  const existing = payload?.oracleConfig?.dedupeKey
  if (typeof existing === 'string' && existing.length > 1) return existing
  return buildDedupeKeyFromPayload(payload)
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Promise<string | null>}
 */
export async function assignDedupeKeyToPayload(payload) {
  if (!payload || typeof payload !== 'object') return null
  const key = await buildDedupeKeyFromPayload(payload)
  if (!key) return null
  const oc = { ...(payload.oracleConfig && typeof payload.oracleConfig === 'object' ? payload.oracleConfig : {}), dedupeKey: key }
  payload.oracleConfig = oc
  return key
}

/**
 * All keys an existing row may match under (stored, recomputed out2, legacy out).
 * @param {Record<string, unknown> | undefined} payload
 */
export async function allDedupeKeysForPayload(payload) {
  const p = payload && typeof payload === 'object' ? payload : {}
  const keys = new Set()
  const stored = p.oracleConfig?.dedupeKey
  if (typeof stored === 'string' && stored.length > 1) keys.add(stored)
  const k = await buildDedupeKeyFromPayload(p)
  if (k) keys.add(k)
  const leg = legacyGenericDedupeKey(p)
  if (leg) keys.add(leg)
  return keys
}

/**
 * @param {Array<{ payload?: Record<string, unknown> }>} rows
 */
export async function buildOccupiedDedupeKeySet(rows) {
  const s = new Set()
  for (const r of rows || []) {
    const ks = await allDedupeKeysForPayload(r.payload)
    for (const k of ks) s.add(k)
  }
  return s
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const t of a) {
    if (b.has(t)) inter += 1
  }
  const u = a.size + b.size - inter
  return u === 0 ? 0 : inter / u
}

/** |A∩B| / min(|A|,|B|) — catches when one title is almost a subset of the other. */
function overlapCoefficient(a, b) {
  let inter = 0
  for (const t of a) {
    if (b.has(t)) inter += 1
  }
  const den = Math.min(a.size, b.size)
  return den === 0 ? 0 : inter / den
}

/**
 * Ordered token sequence (phrase + canon + stem) for bigrams; word order preserved.
 */
function semanticTokenSequenceFromText(fullText) {
  const afterCanon = canonNumericAndDates(fullText)
  const afterPhrase = applyPhraseSynonyms(afterCanon)
  const raw = afterPhrase
    .replace(/[^a-z0-9$%.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const seq = []
  for (let w of raw) {
    w = aliasToken(lightStem(w))
    if (w.length < 2 && !/^\d/.test(w)) continue
    if (STOPWORDS.has(w)) continue
    seq.push(w)
  }
  return seq
}

/**
 * Unigram set + word-bigram set for fuzzy paraphrase detection (no embeddings).
 * @returns {{ unigrams: Set<string>, bigrams: Set<string> }}
 */
export function semanticFeaturesFromPayload(p) {
  const seq = semanticTokenSequenceFromText(outcomeTextBundle(p))
  const unigrams = new Set(seq)
  const bigrams = new Set()
  for (let i = 0; i < seq.length - 1; i++) {
    bigrams.add(`${seq[i]}__${seq[i + 1]}`)
  }
  return { unigrams, bigrams }
}

/** @deprecated use semanticFeaturesFromPayload(p).unigrams */
export function semanticTokenSetFromPayload(p) {
  return semanticFeaturesFromPayload(p).unigrams
}

/**
 * True if candidate matches existing entry (tuned lexical “near-duplicate”).
 */
function textSimilarityMatch(cUni, cBi, eUni, eBi) {
  const ju = jaccard(cUni, eUni)
  const hasBi = cBi.size > 0 && eBi.size > 0
  const jb = hasBi ? jaccard(cBi, eBi) : 0
  const ov = overlapCoefficient(cUni, eUni)
  if (ju >= 0.78) return true
  if (hasBi && ju >= 0.62 && jb >= 0.5) return true
  if (ov >= 0.88 && ju >= 0.48) return true
  if (hasBi && jb >= 0.65 && ju >= 0.42) return true
  return false
}

export function buildSemanticIndex(rows) {
  const entries = []
  for (const r of rows || []) {
    const p = r.payload || {}
    if (isFeedTopicPayload(p)) continue
    const day = resolutionDateKey(p)
    const out = outcomesFingerprint(p)
    if (!day || day.length < 10) continue
    const { unigrams: set, bigrams } = semanticFeaturesFromPayload(p)
    if (set.size < 4) continue
    entries.push({ day, out, unigrams: set, bigrams })
  }
  return entries
}

/**
 * @param {Record<string, unknown>} candidatePayload
 * @param {Array<{ day: string, out: string, unigrams: Set<string>, bigrams: Set<string> }>} index
 * @param {{ minTokens?: number }} [opts]
 */
export function isSemanticNearDuplicateIndexed(candidatePayload, index, opts = {}) {
  const minTokens = opts.minTokens ?? 5
  if (isFeedTopicPayload(candidatePayload)) return false
  const cDay = resolutionDateKey(candidatePayload)
  const cOut = outcomesFingerprint(candidatePayload)
  const { unigrams: cUni, bigrams: cBi } = semanticFeaturesFromPayload(candidatePayload)
  if (!cDay || cDay.length < 10 || cUni.size < minTokens) return false

  for (const e of index) {
    if (e.day !== cDay || e.out !== cOut) continue
    if (textSimilarityMatch(cUni, cBi, e.unigrams, e.bigrams)) return true
  }
  return false
}

/**
 * Push a newly created market into the semantic index (same batch dedupe).
 * @param {Array<{ day: string, out: string, unigrams: Set<string>, bigrams: Set<string> }>} index
 * @param {Record<string, unknown>} payload
 */
export function appendSemanticIndexEntry(index, payload) {
  if (!index || !payload || isFeedTopicPayload(payload)) return
  const day = resolutionDateKey(payload)
  const out = outcomesFingerprint(payload)
  const { unigrams, bigrams } = semanticFeaturesFromPayload(payload)
  if (!day || day.length < 10 || unigrams.size < 4) return
  index.push({ day, out, unigrams, bigrams })
}
