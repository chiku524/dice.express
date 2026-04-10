/**
 * Consistent playful–professional copy for automated markets: outcome-first titles
 * (light emoji prefix) and richer semantic descriptions without changing oracle logic.
 */

const EMOJI_EXTENDED = /^\p{Extended_Pictographic}/u

function startsWithEmoji(s) {
  const t = String(s || '').trim()
  if (!t) return false
  return EMOJI_EXTENDED.test(t)
}

function clip(s, max) {
  const t = String(s || '').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function resolveEmoji(ev) {
  const oc = ev?.oracleConfig && typeof ev.oracleConfig === 'object' ? ev.oracleConfig : {}
  const custom = oc.customType
  if (custom === 'election') return '🗳️'
  if (custom === 'olympics') return '🏅'
  if (custom === 'conflict') return '🕊️'
  if (custom === 'fda_drug') return '💊'
  if (custom === 'court') return '⚖️'
  if (custom === 'legislation') return '🏛️'
  if (custom === 'mna_ipo') return '🤝'
  if (custom === 'macro_data' || custom === 'fed_operator') return '📉'
  if (custom === 'summit') return '🌐'
  if (custom === 'tech_antitrust') return '🧩'

  const mode = oc.newsResolutionMode
  if (mode === 'feed_topic_continuation') return '📰'

  const src = String(ev?.oracleSource || ev?.source || '')
  const sk = String(ev?.sportKey || '')

  if (src === 'the_odds_api' || sk) {
    if (/basketball|nba/i.test(sk)) return '🏀'
    if (/football|nfl|ncaaf/i.test(sk)) return '🏈'
    if (/baseball|mlb/i.test(sk)) return '⚾'
    if (/hockey|nhl/i.test(sk)) return '🏒'
    if (/soccer|epl|mls/i.test(sk)) return '⚽'
    if (/mma/i.test(sk)) return '🥊'
    return '🏟️'
  }
  if (src === 'alpha_vantage' || src === 'alpha_vantage_trend' || src === 'massive') return '📊'
  if (src === 'coingecko' || src === 'coingecko_trend') return '₿'
  if (src === 'openweathermap' || src === 'weatherapi') return '🌤️'
  if (src === 'fred') return '🏦'
  if (src === 'finnhub') return '📈'
  if (src === 'frankfurter') return '💱'
  if (src === 'usgs') return '🌍'
  if (src === 'fec') return '🗳️'
  if (src === 'nasa_neo') return '☄️'
  if (src === 'congress_gov') return '📜'
  if (src === 'bls') return '📋'
  if (src === 'operator_manual') return '📌'
  return '🎯'
}

function hookVariant(seed, variants) {
  let h = 0
  const s = String(seed)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return variants[h % variants.length]
}

/** Readable lane name for discovery copy (not an oracle contract). */
function automationLaneLabel(ev) {
  const oracle = String(ev?.oracleSource || ev?.source || '').trim()
  const map = {
    the_odds_api: 'Sports moneyline (The Odds API)',
    alpha_vantage: 'U.S. equities (Alpha Vantage GLOBAL_QUOTE)',
    alpha_vantage_trend: 'Equity trend threshold (Alpha Vantage)',
    massive: 'U.S. equities (Massive daily aggregates)',
    coingecko: 'Crypto spot (CoinGecko)',
    coingecko_trend: 'Crypto short-horizon trend (CoinGecko)',
    openweathermap: 'Weather forecast (OpenWeather)',
    weatherapi: 'Weather forecast (WeatherAPI.com)',
    gnews: 'News headlines (GNews)',
    perigon: 'News search (Perigon)',
    newsapi_ai: 'News search (NewsAPI.ai)',
    newsdata_io: 'News search (NewsData.io)',
    frankfurter: 'FX ECB reference (Frankfurter)',
    fred: 'Macro rates (FRED)',
    finnhub: 'Earnings calendar (Finnhub)',
    usgs: 'Earthquake catalogue (USGS)',
    fec: 'Campaign finance (OpenFEC)',
    nasa_neo: 'Near-Earth objects (NASA NeoWs)',
    congress_gov: 'Legislative metadata (Congress.gov)',
    bls: 'Labor statistics (BLS)',
    operator_manual: 'Operator-assisted news resolution',
  }
  if (map[oracle]) return map[oracle]
  if (oracle) return oracle.replace(/_/g, ' ')
  return 'Automated feed'
}

/**
 * Structured, semantic anchor from event fields (oracle-neutral summary of what the contract references).
 */
function semanticAnchorLine(ev) {
  if (!ev || typeof ev !== 'object') return ''
  const oc = ev.oracleConfig && typeof ev.oracleConfig === 'object' ? ev.oracleConfig : {}
  const oracle = String(ev.oracleSource || ev.source || '')

  if (ev.homeTeam && ev.awayTeam) {
    const league = ev.sportKey ? String(ev.sportKey).replace(/_/g, ' ') : 'scheduled fixture'
    return `Matchup: ${ev.homeTeam} (home) vs ${ev.awayTeam} (away) · ${league}.`
  }
  if (ev.symbol != null && String(ev.symbol).trim() && ev.threshold != null) {
    const unit = oracle === 'coingecko' || oracle === 'coingecko_trend' ? 'USD spot' : 'quoted threshold'
    return `Instrument ${String(ev.symbol).trim()}; ${unit} $${ev.threshold}.`
  }
  if (ev.coinId && ev.threshold != null) {
    const sym = ev.symbol ? String(ev.symbol) : String(ev.coinId)
    return `${sym} (CoinGecko id ${ev.coinId}); strike $${ev.threshold} USD.`
  }
  if (ev.city && ev.date) {
    return `Place & window: ${ev.city} · calendar date ${String(ev.date).slice(0, 10)} (UTC day boundary for resolution).`
  }
  if (oc.seriesId && oc.threshold != null && oracle === 'fred') {
    return `FRED series ${oc.seriesId}; comparator ${oc.comparator || 'rule in criteria'}; horizon through ${oc.endDate || ev.endDate || 'deadline'}.`
  }
  if (oc.base && oc.quote && oc.threshold != null && oracle === 'frankfurter') {
    return `ECB reference cross ${oc.base}/${oc.quote}; stored threshold ${oc.threshold}.`
  }
  if (oc.finnhubSymbol && oc.epsEstimate != null) {
    return `${oc.finnhubSymbol} Q${oc.quarter} ${oc.year} EPS vs consensus floor $${oc.epsEstimate} (report ~${oc.reportDate || 'TBD'}).`
  }
  if (oc.outcomeResolutionKind === 'usgs_count') {
    return `USGS FDSNWS count ${oc.usgsStartYmd}→${oc.usgsEndYmd}, M≥${oc.minMagnitude}, minimum ${oc.minCount} events.`
  }
  if (oc.outcomeResolutionKind === 'nasa_neo_count') {
    return `NASA NeoWs element_count ${oc.nasaNeoStartYmd}→${oc.nasaNeoEndYmd}; minimum ${oc.neoMinCount}.`
  }
  if (oc.outcomeResolutionKind === 'bls_cpi') {
    return `BLS CPI-U ${oc.blsSeriesId}; index floor ${oc.thresholdIndex} by ${oc.endDate || ev.endDate || 'deadline'}.`
  }
  if (oc.outcomeResolutionKind === 'congress_feed_count') {
    return `Congress.gov session ${oc.congress}; first-page bill array must stay ≥ ${oc.minBillCount} rows.`
  }
  if (oc.outcomeResolutionKind === 'fec_presidential_lead') {
    return `OpenFEC presidential receipts leader for ${oc.fecElectionYear}; anchored candidate ${oc.leaderCandidateId}.`
  }
  const seedQ = oc.seedQuery || oc.q
  const cat = oc.category
  const bits = []
  if (cat) bits.push(`GNews-style category “${String(cat)}”`)
  if (seedQ) bits.push(`discovery query “${clip(String(seedQ), 120)}”`)
  if (bits.length) return `Headline pipeline: ${bits.join(' · ')}.`
  return ''
}

function outcomeHookLine(ev) {
  const oc = ev?.oracleConfig && typeof ev.oracleConfig === 'object' ? ev.oracleConfig : {}
  if (oc.newsResolutionMode === 'feed_topic_continuation') {
    return ''
  }
  const seed = String(ev?.title || ev?.id || '')
  const one = String(ev?.oneLiner || '').trim()
  if (one) {
    return hookVariant(seed, [
      'Yes and No map exactly to the published resolution criteria (oracle or feed logic)—not sentiment or voting.',
      'Settlement is automated from the stated data source and rules below; read the precise rule before trading.',
      'This is a binary contract: the resolution section defines sufficient conditions for Yes and for No.',
      'Trade the rule, not the vibe: only the cited feeds and boolean tests in the criteria can settle the market.',
    ])
  }
  const crit = String(ev?.resolutionCriteria || '').trim()
  if (crit.length > 20 && crit.length < 400) return `Outcome: ${crit}`
  return hookVariant(seed, [
    'Outcome: Resolved strictly from the criteria and oracle payload after the listed deadline.',
    'Outcome: Determined only by the machine-readable rule block and cited data feeds.',
  ])
}

function contextLine(ev) {
  const lane = automationLaneLabel(ev)
  const anchor = semanticAnchorLine(ev)
  const parts = []
  if (lane) parts.push(`Automation lane: ${lane}`)
  const dl = ev?.resolutionDeadline || ev?.endDate
  if (dl && String(dl).length >= 10) {
    try {
      const d = new Date(String(dl))
      if (!Number.isNaN(d.getTime())) {
        parts.push(`resolution gate after ${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`)
      }
    } catch {
      /* ignore */
    }
  }
  const seedKey = `${lane}-${dl || ''}-${anchor.slice(0, 40)}`
  const base = parts.length ? `${parts.join(' · ')}.` : ''
  const variants = anchor
    ? [
        `${base} ${anchor} Read the full criteria before trading.`,
        `${base} ${anchor} The oracle block and resolution criteria override any informal wording.`,
        `${base} ${anchor} Summary only—settlement follows the machine-readable rule text.`,
      ]
    : [
        `${base} Read the full criteria before trading.`,
        `${base} Criteria and oracle fields on this card are authoritative.`,
        `${base} This blurb is a guide; the resolution block controls settlement.`,
      ]
  if (!base && !anchor) return ''
  return hookVariant(seedKey, variants.map((s) => s.replace(/^\s*\./, '').trim()))
}

function mergeDescription(hook, context, existing, title) {
  const ex = String(existing || '').trim()
  const t = String(title || '').trim()
  const blocks = []
  if (hook) blocks.push(hook)
  if (context) blocks.push(context)
  if (ex && ex !== t) {
    const hookPrefix = hook ? hook.slice(0, 48) : ''
    const ctxPrefix = context ? context.slice(0, 48) : ''
    const dupCtx = ctxPrefix && ex.includes(ctxPrefix)
    if ((!hookPrefix || !ex.includes(hookPrefix)) && !dupCtx) blocks.push(ex)
  }
  return clip(blocks.filter(Boolean).join('\n\n'), 3500)
}

/**
 * @param {Record<string, unknown>} ev - Final event before market id / payload
 * @returns {Record<string, unknown>}
 */
export function applyPlayfulOutcomePresentation(ev) {
  if (!ev || typeof ev !== 'object') return ev
  const oc = ev?.oracleConfig && typeof ev.oracleConfig === 'object' ? ev.oracleConfig : {}
  const emoji = resolveEmoji(ev)
  let title = String(ev.title || '').trim()
  if (emoji && title && !startsWithEmoji(title)) {
    title = clip(`${emoji} ${title}`, 160)
  }
  const context = contextLine(ev)
  if (oc.newsResolutionMode === 'feed_topic_continuation') {
    const anchor = semanticAnchorLine(ev)
    const ex = String(ev.description || '').trim()
    const lead = [context, anchor].filter(Boolean).join('\n\n')
    const description = clip([lead, ex].filter(Boolean).join('\n\n'), 3500)
    return { ...ev, title, description }
  }
  const hook = outcomeHookLine(ev)
  const description = mergeDescription(hook, context, ev.description, title)
  return { ...ev, title, description }
}
