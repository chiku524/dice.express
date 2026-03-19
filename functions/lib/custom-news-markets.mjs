/**
 * Infer high-stakes news (elections, Olympics, wars/conflicts) and return
 * custom prediction market title, resolution criteria, and deadline.
 * Used when seeding markets from news so "Will X win the election?" and
 * "Will the Ukraine war end by Y?" get outcome-based markets instead of
 * generic "Will this headline be in top news?"
 */

const NEWS_SOURCES = new Set(['gnews', 'perigon', 'newsapi_ai', 'newsdata_io'])

/** Known US presidential election dates (election day). */
const ELECTION_DEADLINES = {
  2024: '2024-11-05T23:59:59.000Z',
  2028: '2028-11-07T23:59:59.000Z',
  2032: '2032-11-02T23:59:59.000Z',
}

/** End of Olympics (approximate closing). */
const OLYMPICS_DEADLINES = {
  2024: '2024-08-11T23:59:59.000Z',  // Paris
  2026: '2026-02-22T23:59:59.000Z',  // Milan Cortina winter
  2028: '2028-08-12T23:59:59.000Z',  // LA
  2032: '2032-08-08T23:59:59.000Z',  // Brisbane
}

/** Default conflict end: 6 months from now, end of day UTC. */
function defaultConflictDeadline() {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  d.setUTCHours(23, 59, 59, 999)
  return d.toISOString()
}

/** Extract a year from text (e.g. "2024", "2028"). */
function extractYear(text) {
  const m = text.match(/\b(20[2-4][0-9])\b/)
  return m ? parseInt(m[1], 10) : null
}

/** Heuristic: extract leading entity (e.g. candidate name) from headline. Prefer "X wins" or "X vs Y" or first quoted phrase. */
function extractElectionEntity(text) {
  const lower = text.toLowerCase()
  // "X wins the election" / "Will X win"
  let m = text.match(/(?:will\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:win|wins|winning)/i)
  if (m) return m[1].trim()
  m = text.match(/(?:win|wins)\s+(?:the\s+)?(?:election\s+)?(?:for\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (m) return m[1].trim()
  // "X vs Y" / "X versus Y"
  m = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:vs\.?|versus)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (m) return `${m[1].trim()} or ${m[2].trim()}`
  // "X re-elect" / "re-elect X"
  m = text.match(/(?:re-?elect|reelect)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (m) return m[1].trim()
  m = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+re-?elect/i)
  if (m) return m[1].trim()
  return null
}

/** Infer election name from text (e.g. "US presidential", "2024 election"). */
function inferElectionName(text, year) {
  const y = year || extractYear(text) || new Date().getFullYear()
  if (/\b(us|u\.?s\.?|american|united states)\s+(presidential|election)/i.test(text)) return `${y} US presidential election`
  if (/\b(presidential|election)\b/i.test(text)) return `${y} presidential election`
  if (/\b(primary|primaries)\b/i.test(text)) return `${y} primary election`
  return `${y} election`
}

/** Detect conflict name from headline. */
function extractConflictName(text) {
  const lower = text.toLowerCase()
  if (lower.includes('ukraine') && (lower.includes('russia') || lower.includes('war'))) return 'Russia-Ukraine'
  if (lower.includes('gaza') || (lower.includes('israel') && lower.includes('hamas'))) return 'Israel-Hamas / Gaza'
  if (lower.includes('taiwan') && lower.includes('china')) return 'Taiwan-China'
  if (lower.includes('syria')) return 'Syria conflict'
  const warIn = text.match(/\b(the\s+)?war\s+in\s+([a-zA-Z]+)/i)
  if (warIn) return `War in ${warIn[2]}`
  const xxWar = text.match(/\b([a-zA-Z]+)\s+war\b/i)
  if (xxWar) return `${xxWar[1]} war`
  return 'the conflict'
}

/**
 * Enrich a news event into a custom outcome-based market when it looks like
 * election, Olympics, or war/conflict. Returns the same event with overrides
 * (title, description, resolutionCriteria, oneLiner, resolutionDeadline) when
 * a custom interpretation is applied; otherwise returns the event unchanged.
 *
 * @param {object} ev - Event from data-sources (title, description, source, oracleConfig, ...)
 * @returns {object} - ev with optional overrides
 */
export function enrichNewsEvent(ev) {
  if (!ev || !NEWS_SOURCES.has(ev.source)) return ev
  const rawTitle = ev.title || ''
  const rawDesc = ev.description || ''
  const text = `${rawTitle} ${rawDesc}`.replace(/\s+/g, ' ')
  const lower = text.toLowerCase()

  // ---- Elections ----
  if (/\b(presidential|election|re-?elect|nominee|candidate|ballot|vote|primaries)\b/i.test(text) ||
      /\b(will|did)\s+.+\s+win\s+(the\s+)?(.+?\s+)?election/i.test(text) ||
      /\b(2024|2028)\s+election\b/i.test(text)) {
    const year = extractYear(text) || new Date().getFullYear()
    const deadline = ELECTION_DEADLINES[year] || `${year}-12-31T23:59:59.000Z`
    const entity = extractElectionEntity(text)
    const electionName = inferElectionName(text, year)
    const who = entity || 'the leading candidate'
    const title = `Will ${who} win the ${electionName}?`
    const resolutionCriteria = `Yes if ${who} is certified or officially declared winner of the ${electionName} by major outlets (e.g. AP, Reuters) or official certification.`
    const oneLiner = `${who} wins ${electionName}; otherwise No.`
    return {
      ...ev,
      title,
      description: ev.description || title,
      resolutionCriteria,
      oneLiner,
      resolutionDeadline: deadline,
      endDate: deadline.slice(0, 10),
      customType: 'election',
    }
  }

  // ---- Olympics ----
  if (/\bolympic(s)?\b/i.test(text) || /\bgold\s+medal\b/i.test(text) || /\bmedal\s+count\b/i.test(text) ||
      /\b(paris|los angeles|la)\s+20(24|28)\b/i.test(text) || /\bsummer\s+games\b/i.test(text) ||
      /\bwinter\s+games\b/i.test(text)) {
    const year = extractYear(text) || new Date().getFullYear()
    const deadline = OLYMPICS_DEADLINES[year] || (year <= 2024 ? OLYMPICS_DEADLINES[2024] : `${year}-08-15T23:59:59.000Z`)
    // Simplify: outcome-based question about the headline topic by end of Olympics
    const shortHeadline = rawTitle.replace(/^Will\s+"(.+)"\s+be\s+.+$/i, '$1').replace(/^Will\s+/i, '').slice(0, 80)
    const title = shortHeadline.includes('Olympic') || shortHeadline.includes('medal')
      ? `Will ${shortHeadline} by end of ${year} Olympics?`
      : `Will ${shortHeadline} be confirmed by end of ${year} Olympics?`
    const resolutionCriteria = `Yes if the outcome is confirmed by end of the ${year} Olympics per official results or major news.`
    const oneLiner = `Outcome confirmed by end of ${year} Olympics; otherwise No.`
    return {
      ...ev,
      title: title.length > 120 ? title.slice(0, 117) + '…' : title,
      description: ev.description || title,
      resolutionCriteria,
      oneLiner,
      resolutionDeadline: deadline,
      endDate: deadline.slice(0, 10),
      customType: 'olympics',
    }
  }

  // ---- War / conflict ----
  if (/\b(war|ceasefire|peace\s+deal|end\s+of\s+(the\s+)?war|invasion|conflict)\b/i.test(text) ||
      /\b(ukraine|gaza|russia|israel|hamas|taiwan|syria)\b/i.test(text)) {
    const conflict = extractConflictName(text)
    const deadline = defaultConflictDeadline()
    const title = `Will the ${conflict} end by ${deadline.slice(0, 7)}?`
    const resolutionCriteria = `Yes if a formal ceasefire or peace agreement is announced, or major combat is widely reported over for ${conflict}, per major news (e.g. AP, Reuters).`
    const oneLiner = `Ceasefire or end of major combat for ${conflict} by deadline; otherwise No.`
    return {
      ...ev,
      title,
      description: ev.description || title,
      resolutionCriteria,
      oneLiner,
      resolutionDeadline: deadline,
      endDate: deadline.slice(0, 10),
      customType: 'conflict',
    }
  }

  return ev
}
