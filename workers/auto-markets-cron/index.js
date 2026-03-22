/**
 * Cron Worker: seeds automated prediction markets (all APIs with keys) and resolves due markets.
 * Deploy: cd workers/auto-markets-cron && npx wrangler deploy
 * Set env: SITE_URL. Optional: AUTO_MARKETS_CRON_SECRET, AUTO_MARKETS_LIMIT (default 25),
 * AUTO_MARKETS_NEWS_LIMIT (default 50, for news/enriched sources), AUTO_MARKETS_SOURCE.
 * Sports runs once per day (UTC 08:00) to stay under The Odds API 500 req/month.
 */

/**
 * All auto-market sources except `sports` (Odds API quota: sports only at SPORTS_HOUR_UTC).
 * Keep in sync with `AUTO_MARKET_SOURCES` in functions/lib/data-sources.mjs (same order minus leading sports).
 */
const HOURLY_SOURCES = [
  'stocks',
  'crypto',
  'crypto_trend',
  'weather',
  'weatherapi',
  'frankfurter',
  'usgs',
  'fec',
  'nasa_neo',
  'congress_gov',
  'bls',
  'fred',
  'finnhub',
  'news',
  'perigon',
  'newsapi_ai',
  'newsdata_io',
]
const SPORTS_HOUR_UTC = 8

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
      const hour = new Date().getUTCHours()
      const sources = hour === SPORTS_HOUR_UTC ? ['sports', ...HOURLY_SOURCES] : HOURLY_SOURCES
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
