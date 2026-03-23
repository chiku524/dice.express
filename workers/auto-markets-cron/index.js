/**
 * Cron Worker: seeds automated prediction markets (all integrated lanes) and resolves due markets.
 * Deploy: cd workers/auto-markets-cron && npx wrangler deploy
 * Set env: SITE_URL. Optional: AUTO_MARKETS_CRON_SECRET, AUTO_MARKETS_LIMIT (default 25),
 * AUTO_MARKETS_NEWS_LIMIT (default 50), AUTO_MARKETS_SOURCE (single-source override).
 *
 * Default seed_all uses every entry in `AUTO_MARKET_SOURCES` (including **sports**) on each tick.
 * The Odds API free tier is ~500 req/month; at hourly cron that is roughly one sports request per hour
 * (~720/month) — use a paid Odds plan or set AUTO_MARKETS_SOURCE to a single non-sports source if needed.
 */

import { AUTO_MARKET_SOURCES } from '../../functions/lib/data-sources.mjs'

function clampLimit(n, max = 100) {
  const x = parseInt(String(n), 10)
  if (Number.isNaN(x) || x < 1) return 1
  return Math.min(x, max)
}

export default {
  async scheduled(event, env, ctx) {
    const siteUrl = (env.SITE_URL || 'https://dice.express').replace(/\/$/, '')
    const headers = { 'Content-Type': 'application/json' }
    if (env.AUTO_MARKETS_CRON_SECRET) headers['X-Cron-Secret'] = env.AUTO_MARKETS_CRON_SECRET
    if (env.PRIVILEGED_API_SECRET) headers['X-Privileged-Secret'] = env.PRIVILEGED_API_SECRET

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
      body = {
        action: 'seed_all',
        perSourceLimit,
        newsEnrichedPerSourceLimit,
        sources: [...AUTO_MARKET_SOURCES],
      }
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
