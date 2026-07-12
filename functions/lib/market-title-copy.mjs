/**
 * Shared helpers for punchy, semantic automated market titles.
 * Titles stay short and human; oracle/API detail belongs in resolutionCriteria.
 */

import { makeTopicLabel } from './news-market-topic.mjs'

/** Soft cap before emoji presentation (market-presentation clips to 130 with emoji). */
export const TITLE_MAX_BEFORE_EMOJI = 110

/** Patterns that must not ship as user-facing market questions. */
export const VAGUE_TITLE_PATTERNS = [
  /referenced in this headline/i,
  /described in this (news )?thread/i,
  /described in this headline/i,
  /suggested in this headline/i,
  /the leading candidate/i,
]

const COMPANY_DISPLAY = {
  amazon: 'Amazon',
  apple: 'Apple',
  google: 'Google',
  alphabet: 'Alphabet',
  meta: 'Meta',
  microsoft: 'Microsoft',
  openai: 'OpenAI',
  nvidia: 'Nvidia',
  general: 'the company',
}

/**
 * @param {string} s
 * @param {number} [max]
 */
export function clipMarketTitle(s, max = TITLE_MAX_BEFORE_EMOJI) {
  const t = String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) return ''
  if (t.length <= max) return t
  // Prefer clipping before the closing ? so we keep a question mark when possible
  const bodyMax = Math.max(8, max - 1)
  let body = t.endsWith('?') ? t.slice(0, -1) : t
  if (body.length > bodyMax) body = `${body.slice(0, bodyMax - 1)}…`
  return `${body}?`
}

/**
 * @param {string} title
 * @returns {boolean}
 */
export function titleHasVagueCopy(title) {
  const t = String(title || '')
  return VAGUE_TITLE_PATTERNS.some((re) => re.test(t))
}

/**
 * @param {string} slug
 */
export function companyDisplayFromSlug(slug) {
  const key = String(slug || 'general').toLowerCase()
  return COMPANY_DISPLAY[key] || COMPANY_DISPLAY.general
}

/**
 * Build an operator_manual question that names the story, not “this headline”.
 *
 * @param {{
 *   kind: string
 *   headline: string
 *   byDate: string
 *   companySlug?: string
 *   olympicsYear?: number|string
 * }} opts
 */
export function operatorTopicTitle(opts) {
  const kind = opts?.kind
  const byDate = String(opts?.byDate || '').slice(0, 10)
  const topic = makeTopicLabel(opts?.headline || '', 52)
  const co = companyDisplayFromSlug(opts?.companySlug)

  let title
  switch (kind) {
    case 'fda_drug':
      title = `Will FDA action on “${topic}” be confirmed by ${byDate}?`
      break
    case 'court':
      title = `Will the court rule on “${topic}” by ${byDate}?`
      break
    case 'legislation':
      title = `Will Congress act on “${topic}” by ${byDate}?`
      break
    case 'mna_ipo':
      title = `Will the deal in “${topic}” close or price by ${byDate}?`
      break
    case 'macro_data':
      title = `Will the macro print in “${topic}” match the implied direction by ${byDate}?`
      break
    case 'fed_operator':
      title = `Will Fed policy match “${topic}” by ${byDate}?`
      break
    case 'summit':
      title = `Will the diplomatic outcome in “${topic}” land by ${byDate}?`
      break
    case 'tech_antitrust':
      title = `Will ${co} face the antitrust outcome in “${topic}” by ${byDate}?`
      break
    case 'olympics': {
      const year = opts?.olympicsYear
      title = `Will “${topic}” be confirmed by the end of the ${year} Olympics?`
      break
    }
    default:
      title = `Will “${topic}” resolve as described by ${byDate}?`
  }

  return clipMarketTitle(title)
}

export { makeTopicLabel }
