/**
 * Cron Worker: seeds automated prediction markets (all integrated lanes) and resolves due markets.
 * Deploy: cd workers/auto-markets-cron && npx wrangler deploy
 * Set env: SITE_URL. Optional: AUTO_MARKETS_CRON_SECRET, AUTO_MARKETS_LIMIT (default 25),
 * AUTO_MARKETS_NEWS_LIMIT (default 50), AUTO_MARKETS_SOURCE (single-source override).
 *
 * Non-sports sources match `AUTO_MARKET_SOURCES` in functions/lib/data-sources.mjs (including massive).
 * Sports (The Odds API, ~500 req/month): default 4 UTC slots/day; override with AUTO_MARKETS_SPORTS_HOURS_UTC
 * or set AUTO_MARKETS_SPORTS_EVERY_RUN=1 to run every cron tick (high quota use).
 */

import { AUTO_MARKET_SOURCES_WITHOUT_SPORTS } from '../../functions/lib/data-sources.mjs'

/** Default Odds API cadence: four seeds/day (~124/mo at hourly cron). */
const DEFAULT_SPORTS_HOURS_UTC = [2, 8, 14, 20]

/**
 * @param {Record<string, unknown>} env
 * @returns {number[]}
 */
function parseSportsHoursUTC(env) {
  const raw = env.AUTO_MARKETS_SPORTS_HOURS_UTC
  if (raw == null || String(raw).trim() === '') return DEFAULT_SPORTS_HOURS_UTC
  const parts = String(raw)
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((h) => !Number.isNaN(h) && h >= 0 && h <= 23)
  return parts.length > 0 ? parts : DEFAULT_SPORTS_HOURS_UTC
}

/**
 * @param {Record<string, unknown>} env
 * @param {number} hourUtc
 */
function shouldSeedSportsThisRun(env, hourUtc) {
  const every =
    env.AUTO_MARKETS_SPORTS_EVERY_RUN === '1' ||
    env.AUTO_MARKETS_SPORTS_EVERY_RUN === 'true' ||
    String(env.AUTO_MARKETS_SPORTS_EVERY_RUN || '').toLowerCase() === 'yes'
  if (every) return true
  return parseSportsHoursUTC(env).includes(hourUtc)
}

function clampLimit(n, max = 100) {
  const x = parseInt(String(n), 10)
  if (Number.isNaN(x) || x < 1) return 1
  return Math.min(x, max)
}

export default {
  async scheduled(event, env, ctx) {
    const siteUrl = (env.SITE_URL || 'https://dice-express.pages.dev').replace(/\/$/, '')
    const headers = { 'Content-Type': 'application/json' }
    if (env.AUTO_MARKETS_CRON_SECRET) headers['X-Cron-Secret'] = env.AUTO_MARKETS_CRON_SECRET

    const singleSource = env.AUTO_MARKETS_SOURCE
    const perSourceLimit = clampLimit(parseInt(env.AUTO_MARKETS_LIMIT || '25', 10) || 25)
    const newsEnrichedPerSourceLimit = clampLimit(parseInt(env.AUTO_MARKETS_NEWS_LIMIT || '50', 10) || 50)

    let body
    if (singleSource) {
      body = {
        action: 'seed',
        source: singleSource,
        perSourceLimit,
        newsEnrichedPerSourceLimit,
      }
    } else {
      const hourUtc = new Date().getUTCHours()
      const nonSports = [...AUTO_MARKET_SOURCES_WITHOUT_SPORTS]
      const sources = shouldSeedSportsThisRun(env, hourUtc) ? ['sports', ...nonSports] : nonSports
      body = { action: 'seed_all', perSourceLimit, newsEnrichedPerSourceLimit, sources }
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)
      const seedRes = await fetch(`${siteUrl}/api/auto-markets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const seedData = await seedRes.json().catch(() => ({}))
      if (!seedRes.ok) console.error('[auto-markets-cron] seed', seedRes.status, seedData)
      else console.log('[auto-markets-cron] seed', singleSource || 'all', 'created:', seedData.count ?? 0, singleSource ? '' : 'bySource:', seedData.bySource ?? '')
    } catch (err) {
      console.error('[auto-markets-cron] seed', err.message)
    }

    try {
      const resolveRes = await fetch(`${siteUrl}/api/resolve-markets`, { method: 'POST', headers })
      const resolveData = await resolveRes.json().catch(() => ({}))
      if (!resolveRes.ok) console.error('[auto-markets-cron] resolve', resolveRes.status, resolveData)
      else console.log('[auto-markets-cron] resolve due:', resolveData.due ?? 0, 'resolved:', resolveData.resolved ?? 0)
    } catch (err) {
      console.error('[auto-markets-cron] resolve', err.message)
    }
  },
}
