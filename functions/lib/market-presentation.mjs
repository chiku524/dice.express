/**
 * Automated market card copy: emoji-led title + one short punchy description line.
 * Full rules stay in resolutionCriteria on the payload — not duplicated here.
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

export function resolveEmoji(ev) {
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

/** One tight line for the card body — no policy essays. */
function punchyDescriptionLine(ev, titleForDedupe) {
  if (!ev || typeof ev !== 'object') return ''
  const oc = ev.oracleConfig && typeof ev.oracleConfig === 'object' ? ev.oracleConfig : {}
  const em = resolveEmoji(ev)
  const one = String(ev.oneLiner || '').trim()
  if (one) {
    const line = startsWithEmoji(one) ? one : `${em} ${one}`
    return clip(line, 160)
  }

  const oracle = String(ev.oracleSource || ev.source || '')

  if (ev.homeTeam && ev.awayTeam) {
    const league = ev.sportKey ? String(ev.sportKey).replace(/_/g, ' ') : ''
    return clip(
      `${em} ${ev.homeTeam} vs ${ev.awayTeam}${league ? ` · ${league}` : ''} · Odds API final`,
      160
    )
  }
  if (ev.symbol != null && String(ev.symbol).trim() && ev.threshold != null) {
    const sym = String(ev.symbol).trim()
    return clip(`${em} ${sym} ≥ $${ev.threshold} · ${oracle === 'massive' ? 'Massive' : oracle === 'coingecko' || oracle === 'coingecko_trend' ? 'CoinGecko' : 'Alpha Vantage'}`, 160)
  }
  if (ev.coinId && ev.threshold != null) {
    const sym = ev.symbol ? String(ev.symbol) : String(ev.coinId)
    return clip(`${em} ${sym} ≥ $${ev.threshold} · CoinGecko`, 160)
  }
  if (ev.city && ev.date) {
    return clip(`${em} ${ev.city} · ${String(ev.date).slice(0, 10)} · rain rule`, 140)
  }
  if (oc.seriesId && oc.threshold != null && oracle === 'fred') {
    return clip(`${em} DFF ≥ ${oc.threshold}% by ${String(oc.endDate || ev.endDate || '').slice(0, 10)} · FRED`, 140)
  }
  if (oc.base && oc.quote && oc.threshold != null && oracle === 'frankfurter') {
    return clip(`${em} ${oc.base}/${oc.quote} ≥ ${oc.threshold} · ECB`, 120)
  }
  if (oc.finnhubSymbol && oc.epsEstimate != null) {
    return clip(`${em} ${oc.finnhubSymbol} Q${oc.quarter} EPS ≥ $${oc.epsEstimate} · Finnhub`, 140)
  }
  if (oc.outcomeResolutionKind === 'usgs_count') {
    return clip(`${em} ≥${oc.minCount} quakes M≥${oc.minMagnitude} · USGS`, 120)
  }
  if (oc.outcomeResolutionKind === 'nasa_neo_count') {
    return clip(`${em} ≥${oc.neoMinCount} NEOs · NASA`, 100)
  }
  if (oc.outcomeResolutionKind === 'bls_cpi') {
    return clip(`${em} CPI-U ≥ ${oc.thresholdIndex} · BLS`, 100)
  }
  if (oc.outcomeResolutionKind === 'congress_feed_count') {
    return clip(`${em} Congress bills ≥${oc.minBillCount} · session ${oc.congress}`, 120)
  }
  if (oc.outcomeResolutionKind === 'fec_presidential_lead') {
    return clip(`${em} FEC receipts leader · ${oc.fecElectionYear}`, 100)
  }

  if (oc.newsResolutionMode === 'feed_topic_continuation') {
    const ex = String(ev.description || '').trim()
    if (ex && ex !== titleForDedupe) return clip(`${em} ${ex}`, 200)
    return clip(`${em} Headline topic · operator feed`, 80)
  }

  const rawArticleTitle = oc.title && String(oc.title).trim() && oc.title !== ev?.title ? String(oc.title).trim() : ''
  if (rawArticleTitle && oracle === 'operator_manual') {
    return clip(`${em} Thread: ${clip(rawArticleTitle, 100)}`, 160)
  }

  const seedQ = oc.seedQuery || oc.q
  if (seedQ) return clip(`${em} “${clip(String(seedQ), 70)}”`, 120)
  if (oc.category) return clip(`${em} ${String(oc.category)} headlines`, 80)

  const crit = String(ev.resolutionCriteria || '').trim()
  if (crit.length > 12 && crit.length < 200) return clip(`${em} ${crit}`, 160)

  const rawDesc = String(ev.description || '').trim()
  const t = String(titleForDedupe || '').trim()
  if (rawDesc && rawDesc !== t && rawDesc.length < 200) return clip(`${em} ${rawDesc}`, 200)

  return clip(`${em} Binary · see resolution criteria`, 80)
}

/**
 * @param {Record<string, unknown>} ev - Final event before market id / payload
 * @returns {Record<string, unknown>}
 */
export function applyPlayfulOutcomePresentation(ev) {
  if (!ev || typeof ev !== 'object') return ev
  const emoji = resolveEmoji(ev)
  let title = String(ev.title || '').trim()
  if (emoji && title && !startsWithEmoji(title)) {
    title = clip(`${emoji} ${title}`, 130)
  }
  const description = punchyDescriptionLine(ev, title)
  return { ...ev, title, description }
}
