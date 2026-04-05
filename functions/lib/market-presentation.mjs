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
  const parts = []
  const src = String(ev?.source || '').replace(/_/g, ' ')
  if (src) parts.push(`Seeded from "${src}" automation`)
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
  if (!parts.length) return ''
  return hookVariant(`${src}-${dl || ''}`, [
    `${parts.join(' · ')}. Read the full criteria before trading.`,
    `${parts.join(' · ')}. Criteria and oracle fields on this card are authoritative.`,
    `${parts.join(' · ')}. This text is a summary; the resolution block controls settlement.`,
  ])
}

function mergeDescription(hook, context, existing, title) {
  const ex = String(existing || '').trim()
  const t = String(title || '').trim()
  const blocks = []
  if (hook) blocks.push(hook)
  if (context) blocks.push(context)
  if (ex && ex !== t) {
    const hookPrefix = hook ? hook.slice(0, 48) : ''
    if (!hookPrefix || !ex.includes(hookPrefix)) blocks.push(ex)
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
    const ex = String(ev.description || '').trim()
    const description = clip([context, ex].filter(Boolean).join('\n\n'), 3500)
    return { ...ev, title, description }
  }
  const hook = outcomeHookLine(ev)
  const description = mergeDescription(hook, context, ev.description, title)
  return { ...ev, title, description }
}
