/**
 * Validation and defaults for user-created prediction markets.
 * Keep rules aligned with frontend CreateMarket form.
 */

export const USER_MARKET_CATEGORIES = [
  'Finance',
  'Crypto',
  'Sports',
  'Politics',
  'Weather',
  'News',
  'Entertainment',
  'Science',
  'Tech & AI',
  'Other',
]

export const USER_MARKET_STYLES = {
  yesNo: { marketType: 'Binary', outcomes: ['Yes', 'No'], styleLabel: 'yesNo' },
  trueFalse: { marketType: 'Binary', outcomes: ['True', 'False'], styleLabel: 'trueFalse' },
  happensDoesnt: { marketType: 'Binary', outcomes: ['Happens', "Doesn't"], styleLabel: 'happensDoesnt' },
  multiOutcome: { marketType: 'MultiOutcome', outcomes: null, styleLabel: 'multiOutcome' },
}

export const USER_MARKET_LIMITS = {
  titleMin: 10,
  titleMax: 140,
  descriptionMin: 20,
  descriptionMax: 1000,
  criteriaMin: 20,
  criteriaMax: 2000,
  outcomeMinLen: 1,
  outcomeMaxLen: 48,
  multiOutcomeMin: 2,
  multiOutcomeMax: 8,
  /** Min hours from now until resolution deadline */
  minDeadlineHours: 1,
  /** Max days from now until resolution deadline */
  maxDeadlineDays: 365,
  /** Max user markets created per account per rolling day */
  maxPerDay: 5,
  /**
   * Default Pips charged when publishing a user market (non-refundable platform stake).
   * Override with env USER_MARKET_CREATION_STAKE_PIPS.
   * Chosen as 10 PP: above the 1 PP withdrawal-fee floor, meaningful spam deterrent, still low for serious creators.
   */
  creationStakePipsDefault: 10,
}

/**
 * Resolve creation stake from env (non-negative number). 0 disables the charge.
 * @param {Record<string, unknown> | undefined | null} env
 * @returns {number}
 */
export function resolveUserMarketCreationStakePips(env) {
  const raw = env?.USER_MARKET_CREATION_STAKE_PIPS
  if (raw == null || String(raw).trim() === '') return USER_MARKET_LIMITS.creationStakePipsDefault
  const n = parseFloat(String(raw))
  if (!Number.isFinite(n) || n < 0) return USER_MARKET_LIMITS.creationStakePipsDefault
  return Math.round(n * 100) / 100
}

const SPAM_PATTERNS = [
  /\b(buy\s+now|click\s+here|free\s+money|crypto\s+airdrop|viagra|casino\s+bonus)\b/i,
  /(https?:\/\/|www\.)\S{8,}/i,
]

/**
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeSpam(text) {
  const t = String(text || '')
  if (!t.trim()) return false
  return SPAM_PATTERNS.some((re) => re.test(t))
}

/**
 * Normalize and validate a user market create body.
 * @param {Record<string, unknown>} body
 * @param {{ now?: Date }} [opts]
 * @returns {{ ok: true, value: object } | { ok: false, error: string, status?: number, details?: object }}
 */
export function validateUserMarketCreate(body, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date()
  const lim = USER_MARKET_LIMITS

  const title = String(body?.title || '').trim()
  const description = String(body?.description || '').trim()
  const resolutionCriteria = String(body?.resolutionCriteria || '').trim()
  const category = String(body?.category || '').trim()
  const styleKeyRaw = String(body?.styleLabel || body?.style || 'yesNo').trim()
  const styleKey = USER_MARKET_STYLES[styleKeyRaw] ? styleKeyRaw : 'yesNo'
  const style = USER_MARKET_STYLES[styleKey]

  if (title.length < lim.titleMin || title.length > lim.titleMax) {
    return {
      ok: false,
      status: 400,
      error: `Title must be ${lim.titleMin}–${lim.titleMax} characters.`,
    }
  }
  if (description.length < lim.descriptionMin || description.length > lim.descriptionMax) {
    return {
      ok: false,
      status: 400,
      error: `Description must be ${lim.descriptionMin}–${lim.descriptionMax} characters.`,
    }
  }
  if (resolutionCriteria.length < lim.criteriaMin || resolutionCriteria.length > lim.criteriaMax) {
    return {
      ok: false,
      status: 400,
      error: `Resolution criteria must be ${lim.criteriaMin}–${lim.criteriaMax} characters.`,
    }
  }
  if (!USER_MARKET_CATEGORIES.includes(category)) {
    return {
      ok: false,
      status: 400,
      error: 'Pick a valid category.',
      details: { allowed: USER_MARKET_CATEGORIES },
    }
  }
  if (looksLikeSpam(`${title} ${description}`)) {
    return {
      ok: false,
      status: 400,
      error: 'Market text looks like spam or promotional links. Keep it a clear prediction question.',
    }
  }

  let marketType = style.marketType
  let outcomes = style.outcomes ? [...style.outcomes] : []

  if (styleKey === 'multiOutcome' || String(body?.marketType) === 'MultiOutcome') {
    marketType = 'MultiOutcome'
    const raw = Array.isArray(body?.outcomes) ? body.outcomes : []
    const cleaned = [
      ...new Set(
        raw
          .map((o) => String(o).trim())
          .filter((o) => o.length >= lim.outcomeMinLen && o.length <= lim.outcomeMaxLen)
      ),
    ].slice(0, lim.multiOutcomeMax)
    if (cleaned.length < lim.multiOutcomeMin) {
      return {
        ok: false,
        status: 400,
        error: `Multi-outcome markets need ${lim.multiOutcomeMin}–${lim.multiOutcomeMax} unique labels.`,
      }
    }
    outcomes = cleaned
  } else if (Array.isArray(body?.outcomes) && body.outcomes.length === 2) {
    const pair = body.outcomes.map((o) => String(o).trim()).filter(Boolean)
    if (pair.length === 2) outcomes = pair
  }

  const deadlineRaw = body?.resolutionDeadline
  if (!deadlineRaw) {
    return { ok: false, status: 400, error: 'Resolution deadline is required.' }
  }
  const deadline = new Date(String(deadlineRaw))
  if (Number.isNaN(deadline.getTime())) {
    return { ok: false, status: 400, error: 'Resolution deadline must be a valid date/time.' }
  }
  const minMs = now.getTime() + lim.minDeadlineHours * 60 * 60 * 1000
  const maxMs = now.getTime() + lim.maxDeadlineDays * 24 * 60 * 60 * 1000
  if (deadline.getTime() < minMs) {
    return {
      ok: false,
      status: 400,
      error: `Deadline must be at least ${lim.minDeadlineHours} hour(s) from now.`,
    }
  }
  if (deadline.getTime() > maxMs) {
    return {
      ok: false,
      status: 400,
      error: `Deadline cannot be more than ${lim.maxDeadlineDays} days from now.`,
    }
  }

  // Prefer end-of-UTC-day when client sends date-only YYYY-MM-DD
  let resolutionDeadline = deadline.toISOString()
  const dateOnly = String(deadlineRaw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    resolutionDeadline = `${dateOnly}T23:59:59.000Z`
  }

  const oneLiner = title.endsWith('?') ? title : `${title}?`

  return {
    ok: true,
    value: {
      title,
      description,
      resolutionCriteria,
      category,
      marketType,
      outcomes,
      styleLabel: styleKey === 'multiOutcome' ? 'multiOutcome' : style.styleLabel,
      resolutionDeadline,
      oneLiner,
      settlementTrigger: { tag: 'Manual' },
      oracleSource: 'manual',
      source: 'user',
    },
  }
}

/**
 * Validate creator resolve payload for a user market.
 * @param {object} marketPayload
 * @param {{ accountId?: string, resolvedOutcome?: string }} body
 */
export function validateUserMarketResolve(marketPayload, body) {
  if (!marketPayload || marketPayload.source !== 'user') {
    return { ok: false, status: 400, error: 'Not a user-created market.' }
  }
  const accountId = String(body?.accountId || '').trim()
  if (!accountId || accountId !== String(marketPayload.creatorAccountId || '')) {
    return { ok: false, status: 403, error: 'Only the market creator can resolve this market.' }
  }
  const status = marketPayload.status || 'Active'
  if (status === 'Settled') {
    return { ok: false, status: 400, error: 'Market is already settled.' }
  }
  const outcome = String(body?.resolvedOutcome || '').trim()
  if (!outcome) {
    return { ok: false, status: 400, error: 'resolvedOutcome is required (outcome label or Void).' }
  }
  if (outcome === 'Void') {
    return { ok: true, value: { resolvedOutcome: 'Void' } }
  }
  const outcomes = Array.isArray(marketPayload.outcomes) ? marketPayload.outcomes.map(String) : ['Yes', 'No']
  if (!outcomes.includes(outcome)) {
    return {
      ok: false,
      status: 400,
      error: `resolvedOutcome must be one of: ${outcomes.join(', ')}, or Void.`,
      details: { outcomes },
    }
  }
  return { ok: true, value: { resolvedOutcome: outcome } }
}
