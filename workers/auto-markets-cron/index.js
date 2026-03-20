/**
 * Cron Worker: seeds automated prediction markets (all APIs with keys) and resolves due markets.
 * Deploy: cd workers/auto-markets-cron && npx wrangler deploy
 * Set env: SITE_URL. Optional: AUTO_MARKETS_CRON_SECRET, AUTO_MARKETS_LIMIT, AUTO_MARKETS_SOURCE.
 * Sports runs once per day (UTC 08:00) to stay under The Odds API 500 req/month.
 */

const HOURLY_SOURCES = [
  'stocks',
  'crypto',
  'crypto_trend',
  'weather',
  'weatherapi',
  'news',
  'perigon',
  'newsapi_ai',
  'newsdata_io',
]
const SPORTS_HOUR_UTC = 8

export default {
  async scheduled(event, env, ctx) {
    const siteUrl = (env.SITE_URL || 'https://dice-express.pages.dev').replace(/\/$/, '')
    const headers = { 'Content-Type': 'application/json' }
    if (env.AUTO_MARKETS_CRON_SECRET) headers['X-Cron-Secret'] = env.AUTO_MARKETS_CRON_SECRET

    const singleSource = env.AUTO_MARKETS_SOURCE
    const perSourceLimit = Math.min(parseInt(env.AUTO_MARKETS_LIMIT || '5', 10) || 5, 20)

    let body
    if (singleSource) {
      body = { action: 'seed', source: singleSource, limit: perSourceLimit }
    } else {
      const hour = new Date().getUTCHours()
      const sources = hour === SPORTS_HOUR_UTC ? ['sports', ...HOURLY_SOURCES] : HOURLY_SOURCES
      body = { action: 'seed_all', perSourceLimit, sources }
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

    // 2. Resolve due markets (settle winners)
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
