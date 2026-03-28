/**
 * Automated resolution for oracleSource operator_manual (custom news markets).
 * After resolutionDeadline: infer Yes/No from news search; if still ambiguous, settle Void (refunds).
 */
import * as ds from './data-sources.mjs'
import { extractSignificantTokens, normalizeNewsToken } from './news-market-topic.mjs'
import { predictionLog } from './prediction-observability.mjs'

const ELECTION_YES =
  /\b(certif(?:ied|ication)?|projected\s+winner|declared\s+winner|wins?\s+the|won\s+the|elected|reelected|reelect|clinch(?:ed|es)?|AP\s+calls|call\s+the\s+election|concession\s+from|opponent\s+conced)\b/i
const ELECTION_NO =
  /\b(lost\s+the|loses\s+the|defeat(?:ed)?\s+in|conced(?:e|ed|es|ing)|withdraws?\s+from\s+(?:the\s+)?race|eliminated\s+from|drops?\s+out\s+of\s+(?:the\s+)?race)\b/i

const OLY_YES =
  /\b(confirmed|gold\s+medal|silver\s+medal|bronze\s+medal|medalist|official\s+result|wins?\s+gold|won\s+gold|sets?\s+(?:an?\s+)?(?:world\s+)?record|Olympic\s+champion)\b/i
const OLY_NO = /\b(disqualified|doping\s+ban|stripped\s+of\s+medal)\b/i

const CONFLICT_YES =
  /\b(ceasefire|peace\s+(?:deal|agreement)|truce|combat\s+ends?|withdrawal\s+complete|war\s+ends?|conflict\s+ends?)\b/i
const CONFLICT_NO = /\b(fighting\s+resumes?|escalat|major\s+offensive|airstrike)\b/i

const FDA_YES =
  /\b(FDA\s+(?:approv|clear|authoriz)|full\s+approval|granted\s+approval|PDUFA|clearance\s+granted)\b/i
const FDA_NO = /\b(complete\s+response\s+letter|rejects?\s+application|clinical\s+hold)\b/i

const COURT_YES =
  /\b(rules?\s+for|upholds?|overturns?|strikes?\s+down|affirms?|remands?|issues?\s+(?:a\s+)?(?:ruling|decision|order))\b/i
const COURT_NO = /\b(dismiss(?:ed|es)|denied|rejects?\s+(?:the\s+)?(?:case|petition))\b/i

const GENERIC_YES =
  /\b(confirmed|official(?:ly)?|final(?:ized)?|signed\s+into\s+law|becomes\s+law|closes?\s+(?:the\s+)?deal|completed\s+IPO|approved|announces?\s+(?:a\s+)?(?:deal|agreement)|reached\s+(?:a\s+)?deal)\b/i
const GENERIC_NO =
  /\b(failed|collaps(?:e|ed|es)|abandon(?:ed|s)?|blocked|halted|scrapped|walked\s+away|terminated\s+the\s+deal|vetoed)\b/i

/** @param {Record<string, unknown>} env */
function operatorNewsMinIntervalMs(env) {
  const raw = env?.OPERATOR_MANUAL_NEWS_MIN_INTERVAL_MS
  const n = parseInt(String(raw ?? '21600000'), 10)
  return Number.isFinite(n) && n >= 60000 ? n : 21600000
}

export function anchorSetFromMarket(payload, cfg) {
  const parts = [payload.title, cfg.seedHeadline, cfg.seedQuery].filter(Boolean).join(' ')
  const tokens = extractSignificantTokens(parts)
  return new Set(tokens.map(normalizeNewsToken))
}

export function minOverlap(anchorSet) {
  const n = anchorSet.size
  if (n <= 0) return 2
  if (n <= 2) return 1
  if (n <= 5) return 2
  return 3
}

export function titleOverlapsAnchors(anchorSet, title, minO) {
  const cand = new Set(extractSignificantTokens(title).map(normalizeNewsToken))
  let c = 0
  for (const a of anchorSet) {
    if (cand.has(a)) c += 1
  }
  return c >= minO
}

function electionEntityHints(cfg) {
  const slug = cfg.electionEntitySlug
  if (!slug || typeof slug !== 'string') return null
  return slug
    .split(/[-_]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 2)
}

function titleMatchesEntityHints(title, hints) {
  if (!hints || hints.length === 0) return true
  const low = title.toLowerCase()
  return hints.some((h) => low.includes(h))
}

/**
 * @param {object} env
 * @param {object} cfg - oracleConfig
 * @param {object} payload - market payload
 * @param {{ pastDeadline?: boolean, dryRun?: boolean }} [fetchOpts]
 * @returns {Promise<{ titles: string[], didFetch: boolean, skippedThrottle?: boolean }>}
 */
export async function fetchOperatorManualTitles(env, cfg, payload, fetchOpts = {}) {
  const { pastDeadline = false, dryRun = false } = fetchOpts
  const intervalMs = operatorNewsMinIntervalMs(env)
  const last = cfg.lastOperatorNewsFetchAt
  if (!dryRun && !pastDeadline && last) {
    const lastMs = new Date(last).getTime()
    if (!Number.isNaN(lastMs) && Date.now() - lastMs < intervalMs) {
      return { titles: [], didFetch: false, skippedThrottle: true }
    }
  }

  const q =
    (cfg.seedQuery && String(cfg.seedQuery).trim()) ||
    (payload.title && String(payload.title).trim()) ||
    (cfg.seedHeadline && String(cfg.seedHeadline).trim()) ||
    'news'
  const limit = 30
  const trySources = []
  if (cfg.seedNewsSource === 'gnews' && env.GNEWS_API_KEY) trySources.push('gnews')
  if (cfg.seedNewsSource === 'perigon' && env.PERIGON_API_KEY) trySources.push('perigon')
  if (cfg.seedNewsSource === 'newsdata_io' && env.NEWSDATA_API_KEY) trySources.push('newsdata_io')
  if (cfg.seedNewsSource === 'newsapi_ai' && env.NEWSAPI_AI_KEY) trySources.push('newsapi_ai')
  if (trySources.length === 0) {
    if (env.GNEWS_API_KEY) trySources.push('gnews')
    if (env.PERIGON_API_KEY) trySources.push('perigon')
    if (env.NEWSDATA_API_KEY) trySources.push('newsdata_io')
    if (env.NEWSAPI_AI_KEY) trySources.push('newsapi_ai')
  }
  const titles = []
  const seen = new Set()
  const qShort = q.slice(0, 200)
  let anyFetch = false

  for (const src of trySources) {
    try {
      let batch = []
      if (src === 'gnews') {
        const articles = await ds.fetchGNewsSearch(env, qShort, 'en', limit)
        batch = articles.map((a) => (a.title ? String(a.title) : '')).filter(Boolean)
      } else if (src === 'perigon') {
        const articles = await ds.fetchPerigonSearch(env, qShort, limit)
        batch = articles.map((a) => String(a.title || a.headline || '')).filter(Boolean)
      } else if (src === 'newsdata_io') {
        const articles = await ds.fetchNewsDataIoLatest(env, qShort, 'en', limit)
        batch = articles.map((a) => String(a.title || '')).filter(Boolean)
      } else if (src === 'newsapi_ai') {
        const articles = await ds.fetchNewsApiAiSearch(env, qShort, limit)
        batch = articles.map((a) => String(a.title || a.name || '')).filter(Boolean)
      }
      anyFetch = true
      for (const t of batch) {
        const k = t.toLowerCase()
        if (seen.has(k)) continue
        seen.add(k)
        titles.push(t)
      }
    } catch (e) {
      console.warn('[operator-manual-resolve]', src, e?.message)
    }
  }
  return { titles, didFetch: anyFetch }
}

export function inferFromTitles(customType, titles, anchorSet, cfg) {
  const minO = minOverlap(anchorSet)
  const entHints = customType === 'election' ? electionEntityHints(cfg) : null

  const pick = (yesRe, noRe) => {
    let yesHit = false
    let noHit = false
    for (const t of titles) {
      if (!titleOverlapsAnchors(anchorSet, t, minO)) continue
      if (entHints && !titleMatchesEntityHints(t, entHints)) continue
      if (yesRe.test(t)) yesHit = true
      if (noRe.test(t)) noHit = true
    }
    if (yesHit && noHit) return null
    if (yesHit) return 'Yes'
    if (noHit) return 'No'
    return null
  }

  switch (customType) {
    case 'election':
      return pick(ELECTION_YES, ELECTION_NO)
    case 'olympics':
      return pick(OLY_YES, OLY_NO)
    case 'conflict':
      return pick(CONFLICT_YES, CONFLICT_NO)
    case 'fda_drug':
      return pick(FDA_YES, FDA_NO)
    case 'court':
      return pick(COURT_YES, COURT_NO)
    case 'legislation':
    case 'mna_ipo':
    case 'macro_data':
    case 'fed_operator':
    case 'summit':
    case 'tech_antitrust':
    default:
      return pick(GENERIC_YES, GENERIC_NO)
  }
}

const MULTI_OUTCOME_MIN_TITLE_HITS = 2

/**
 * Multi-outcome + operator_manual: match outcome labels in news titles (anchor overlap), else Void at deadline.
 */
export async function resolveOperatorManualMultiOutcome(env, market, options = {}) {
  const dryRun = options.dryRun === true
  const payload = market.payload || {}
  const cfg = payload.oracleConfig || {}
  const outcomes = Array.isArray(payload.outcomes) ? payload.outcomes.map((o) => String(o).trim()).filter(Boolean) : []
  if (outcomes.length < 2) return { resolved: false, meta: { reason: 'outcomes' } }

  const dlRaw = payload.resolutionDeadline
  if (!dlRaw) return { resolved: false, meta: { reason: 'no_deadline' } }
  const deadlineMs = new Date(dlRaw).getTime()
  if (Number.isNaN(deadlineMs)) return { resolved: false, meta: { reason: 'bad_deadline' } }

  const pastDeadline = Date.now() >= deadlineMs
  let titles = []
  let didFetch = false
  let skippedThrottle = false
  try {
    const fr = await fetchOperatorManualTitles(env, cfg, payload, { pastDeadline, dryRun })
    titles = fr.titles
    didFetch = fr.didFetch
    skippedThrottle = fr.skippedThrottle === true
  } catch (e) {
    console.warn('[operator-manual-resolve] multi fetch', e?.message)
  }

  if (!pastDeadline && skippedThrottle) {
    return { resolved: false, meta: { titleCount: 0, didFetch: false, skippedThrottle: true, multi: true } }
  }

  const anchorSet = anchorSetFromMarket(payload, cfg)
  const minO = minOverlap(anchorSet)
  /** @type {Record<string, number>} */
  const scores = {}
  for (const o of outcomes) scores[o] = 0
  const oLower = outcomes.map((o) => ({ o, low: o.toLowerCase() }))

  for (const t of titles) {
    if (!titleOverlapsAnchors(anchorSet, t, minO)) continue
    const tl = t.toLowerCase()
    for (const { o, low } of oLower) {
      if (low.length >= 3 && tl.includes(low)) scores[o] += 1
    }
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const best = ranked[0]
  const second = ranked[1] || ['', 0]
  const uniqueWinner =
    best[1] >= MULTI_OUTCOME_MIN_TITLE_HITS && best[1] > second[1] && best[0]

  if (uniqueWinner) {
    predictionLog('operator_manual.multi_resolved', {
      marketId: market.contractId,
      outcome: best[0],
      score: best[1],
      titleCount: titles.length,
      dryRun,
    })
    return {
      resolved: true,
      outcome: best[0],
      meta: { titleCount: titles.length, didFetch, multi: true, inferred: true },
    }
  }

  if (pastDeadline) {
    predictionLog('operator_manual.multi_void', {
      marketId: market.contractId,
      titleCount: titles.length,
      dryRun,
    })
    return {
      resolved: true,
      outcome: 'Void',
      meta: { titleCount: titles.length, didFetch, multi: true, inferred: false },
    }
  }

  return { resolved: false, meta: { titleCount: titles.length, didFetch, multi: true } }
}

/**
 * @param {object} env
 * @param {object} market - contract row with payload
 * @param {{ dryRun?: boolean }} [options]
 */
export async function resolveOperatorManualOutcome(env, market, options = {}) {
  const dryRun = options.dryRun === true
  const payload = market.payload || {}
  const cfg = payload.oracleConfig || {}
  const dlRaw = payload.resolutionDeadline
  if (!dlRaw) return { resolved: false, meta: { reason: 'no_deadline' } }

  const deadlineMs = new Date(dlRaw).getTime()
  if (Number.isNaN(deadlineMs)) return { resolved: false, meta: { reason: 'bad_deadline' } }

  const now = Date.now()
  const pastDeadline = now >= deadlineMs

  const customType = cfg.customType
  if (!customType) {
    if (pastDeadline) {
      predictionLog('operator_manual.void_no_custom_type', { marketId: market.contractId, dryRun })
      return { resolved: true, outcome: 'Void', meta: { titleCount: 0, didFetch: false, customType: null } }
    }
    return { resolved: false, meta: { customType: null } }
  }

  let titles = []
  let didFetch = false
  let skippedThrottle = false
  try {
    const fr = await fetchOperatorManualTitles(env, cfg, payload, { pastDeadline, dryRun })
    titles = fr.titles
    didFetch = fr.didFetch
    skippedThrottle = fr.skippedThrottle === true
  } catch (e) {
    console.warn('[operator-manual-resolve] fetch', e?.message)
  }

  if (!pastDeadline && skippedThrottle) {
    return {
      resolved: false,
      meta: { titleCount: 0, didFetch: false, skippedThrottle: true, customType },
    }
  }

  const anchorSet = anchorSetFromMarket(payload, cfg)
  const inferred = titles.length ? inferFromTitles(customType, titles, anchorSet, cfg) : null

  const marketId = market.contractId || market.contract_id || ''

  if (inferred) {
    predictionLog('operator_manual.resolved', {
      marketId,
      customType,
      outcome: inferred,
      titleCount: titles.length,
      dryRun,
    })
    return {
      resolved: true,
      outcome: inferred,
      meta: { titleCount: titles.length, didFetch, customType, inferred: true },
    }
  }
  if (pastDeadline) {
    predictionLog('operator_manual.void_ambiguous', {
      marketId,
      customType,
      titleCount: titles.length,
      dryRun,
    })
    return {
      resolved: true,
      outcome: 'Void',
      meta: { titleCount: titles.length, didFetch, customType, inferred: false },
    }
  }
  predictionLog('operator_manual.unresolved', {
    marketId,
    customType,
    titleCount: titles.length,
    dryRun,
  })
  return { resolved: false, meta: { titleCount: titles.length, didFetch, customType } }
}
