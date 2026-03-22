# Auto-markets troubleshooting

## Where secrets must live

**API keys (THE_ODDS_API_KEY, ALPHA_VANTAGE_API_KEY, GNEWS_API_KEY, etc.) must be set on the Pages project** that serves your site and `/api/*`, not only on the cron Worker.

- **Pages** → Your project → **Settings** → **Environment variables** (Production and/or Preview).
- The cron Worker only needs **SITE_URL** (and optionally AUTO_MARKETS_CRON_SECRET, AUTO_MARKETS_LIMIT). It does **not** call the external APIs; it calls your Pages URL. Pages Functions then use **their** env to call The Odds API, Alpha Vantage, etc.

If keys are only on the Worker (or a different project), the API will see empty env for those keys and return 0 events from those sources.

---

## Why an API can “malfunction” even when the key is set

| Cause | What happens | What to do |
|-------|----------------|------------|
| **Rate limit** | API returns 429 or error; we catch and return `[]` for that source. | Alpha Vantage: 25 req/day. The Odds API: 500 req/month. Reduce `AUTO_MARKETS_LIMIT` or run seed less often. |
| **Invalid or expired key** | API returns 401/403; we catch and return `[]`. | Rotate key in provider dashboard, update Pages env. |
| **Key on wrong project** | Pages Functions don’t see the key (see above). | Add the same secret to **Pages** → Environment variables. |
| **API blocks Cloudflare IPs** | Some providers block datacenter IPs; request fails or is rate-limited. | CoinGecko public API often does this; try Pro key or accept empty crypto. |
| **No data for that moment** | e.g. no upcoming games for the sport key, or empty news for that query. | Normal; next run may have data. |

Use **GET /api/auto-markets?action=probe** (after deploy) to confirm which keys **Pages** sees (`keysPresent`). Then call **GET …?action=events&source=X&limit=2** per source to see if events come back.

---

## Why “5 sources working” but no markets created today

If manual calls to `?action=events` return events for several sources (e.g. weather, gnews, perigon, newsapi_ai, weatherapi) but **no new markets appear today**, the usual cause is that **seed_all is not running** in production (or not hitting the right deployment).

Reason:

- **News sources** (gnews, perigon, newsapi_ai, newsdata_io) use **`Date.now()` in the event id**, so each run gets **new** ids and would create new markets every time the cron runs.
- So if the cron were running and calling your **Pages** `/api/auto-markets` with `POST { action: "seed_all", perSourceLimit: 4 }`, you would see new news markets every hour. If you see **zero** new markets today, the cron either:
  1. Is not deployed or not triggering, or  
  2. Is calling the wrong **SITE_URL** (e.g. different domain, or preview deployment without DB), or  
  3. Gets a failure (timeout, 5xx) before the API can write markets.

**Stable-id sources** (sports, stocks, weather, crypto) create at most one market per event/game/date. So “working” there can still mean “all events were already in DB” and `created: 0` for that run. That does **not** explain zero new **news** markets if the cron is actually running.

---

## Checklist

1. **Confirm API keys are on Pages**  
   Open **GET https://YOUR_SITE/api/auto-markets?action=probe**. Check `keysPresent`. All keys you expect (Odds, Alpha Vantage, GNews, etc.) should be `true` for the deployment that serves that URL.

2. **Confirm cron Worker is deployed and triggering**  
   Cloudflare Dashboard → **Workers & Pages** → **dice-express-auto-markets-cron** → **Logs**. Filter by Cron trigger. You should see hourly runs and logs like `[auto-markets-cron] seed all created: N bySource: {...}`.

3. **Confirm SITE_URL**  
   On the **cron Worker**, **Settings** → Variables and Secrets. **SITE_URL** must be the **exact** base URL of the Pages deployment that has the env vars and D1 (e.g. `https://dice-express.pages.dev` or your custom domain). No trailing slash. If this points at a different app or a preview URL without DB, seed will not create markets in your production DB.

4. **Run seed manually**  
   From a browser or curl:
   ```bash
   curl -X POST "https://YOUR_SITE/api/auto-markets" \
     -H "Content-Type: application/json" \
     -d '{"action":"seed_all","perSourceLimit":5}'
   ```
   Check the JSON: `count` (new markets created), `bySource` (events per source), `created`, `skipped`. If you get `count > 0` here but never from cron, the issue is cron (deploy, schedule, or SITE_URL). If you get `count: 0` and `bySource` all zeros, Pages env or upstream APIs are the issue. If `bySource` has non-zero counts but `count: 0`, every event was a duplicate (expected for stable-id sources; for news it would mean something is wrong with the id or DB).

5. **Optional: cron secret**  
   If you set **AUTO_MARKETS_CRON_SECRET** on the **Pages** project, `POST /api/auto-markets` seed actions require a matching `X-Cron-Secret` header. Set the **same** secret on the cron Worker so scheduled runs succeed. Leave the secret unset on Pages if you want open manual seeding (not recommended for production).

---

## Integrated sources and typical limits

| Source | Env key | Typical limit / note |
|--------|---------|----------------------|
| Sports | THE_ODDS_API_KEY | 500 req/month (free); cron runs sports once/day at UTC 08:00 |
| Stocks | ALPHA_VANTAGE_API_KEY | 25 req/day (free); cron uses 1 symbol per run, stocks_trend excluded from default |
| Crypto | COINGECKO_API_KEY (optional) | Public API rate-limited; Pro key helps |
| Crypto trend | COINGECKO_API_KEY (optional) | Same |
| Weather | OPENWEATHER_API_KEY | Free tier |
| Weather | WEATHERAPI_API_KEY | Free tier |
| News | GNEWS_API_KEY | Depends on plan |
| News | PERIGON_API_KEY | Depends on plan |
| News | NEWSAPI_AI_KEY | Depends on plan |
| News | NEWSDATA_API_KEY | Depends on plan |
| Other | RAPIDAPI_KEY, MASSIVE_API_KEY | Per-provider |

If a key is set and probe shows `true` but events are still empty, the next step is provider rate limits, key validity, or (for crypto) Cloudflare IP blocking.
