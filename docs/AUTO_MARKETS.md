# Auto-markets: cron Worker and operations

The **dice-express-auto-markets-cron** Cloudflare Worker calls your dice.express **Pages** API on a schedule to **seed** automated prediction markets (sports, crypto, stocks, weather, news, etc.) and run **`POST /api/resolve-markets`**. It uses **free-tier APIs** where configured (The Odds API, CoinGecko, Alpha Vantage, OpenWeather, etc.) — no cost within provider limits.

**Important:** External **API keys** (`THE_ODDS_API_KEY`, `ALPHA_VANTAGE_API_KEY`, …) must be set on the **Pages** project that serves `/api/*`, not only on the cron Worker. The Worker only needs **`SITE_URL`** (and optional secrets below); it does not call third-party APIs directly.

---

## Deploy

```bash
cd workers/auto-markets-cron
npx wrangler deploy
```

---

## Worker environment variables

Set in Cloudflare Dashboard → Workers & Pages → **dice-express-auto-markets-cron** → Settings → Variables and Secrets:

| Variable | Required | Description |
|----------|----------|-------------|
| **SITE_URL** | Yes | Your site base URL (committed default: `https://dice.express`). No trailing slash. Override in Dashboard if needed. |
| **AUTO_MARKETS_SOURCE** | No | If **unset**, the Worker runs **seed_all** with the full source list (see `workers/auto-markets-cron/index.js`). If **set** (e.g. `sports`), only that single source runs each hour — use for debugging, not for “use all keys”. |
| **AUTO_MARKETS_LIMIT** | No | Per-source cap for **non-news** APIs (default `25` in `wrangler.toml`, hard max `100` in API). Lower (e.g. `4`) reduces markets per run and API usage; it does **not** control news volume (see next row). |
| **AUTO_MARKETS_NEWS_LIMIT** | No | Per-source cap for **news / enriched** sources (`news`, `perigon`, `newsapi_ai`, `newsdata_io`). Default `50` when unset in Worker env. |
| **AUTO_MARKETS_CRON_SECRET** | No | If set on the **Worker**, every seed request sends `X-Cron-Secret`. If you set the **same** variable on the **Pages** project, `POST /api/auto-markets` seed actions **require** a matching header (401 otherwise). Use both together for production. |
| **PRIVILEGED_API_SECRET** | No | If set on **Pages**, ops-only `POST` routes (including **`/api/resolve-markets`**) require **`X-Privileged-Secret`** unless **`X-Cron-Secret`** matches **`AUTO_MARKETS_CRON_SECRET`**. Set the **same** value on this Worker so the hourly **`resolve-markets`** call succeeds. See **`docs/API.md`** (Ops-only routes). |

---

## Cron schedule

Default: **every hour** (`0 * * * *`). Each run (1) seeds new markets, then (2) calls **POST /api/resolve-markets**.

**All lanes every tick:** `seed_all` sends the full **`AUTO_MARKET_SOURCES`** list from `functions/lib/data-sources.mjs` (including **sports** and **massive**) on **every** cron execution. Only **new** stable market IDs are inserted; duplicates are skipped.

**Sports (The Odds API):** Free tier is ~**500 requests/month**; hourly cron is ~**720** sports calls/month — use a **paid Odds plan** or set **`AUTO_MARKETS_SOURCE`** to a single non-sports key for a cheaper debugging setup.

**Outcome-based markets** stay controlled on **Pages** (`AUTO_MARKETS_OUTCOME_ONLY`, `AUTO_MARKETS_ALLOW_FEED_TOPIC`); the cron does not create feed-topic-only headline markets by itself.

**Vectorize / embeddings:** After a large D1 wipe or to backfill older markets, call **POST `/api/prediction-maintenance`** on the Pages project (same cron secret or `PREDICTION_MAINTENANCE_SECRET`). See **`PREDICTION_MARKETS.md`** (Maintenance section).

Edit `workers/auto-markets-cron/wrangler.toml` → `[triggers]` → `crons` to change cadence (e.g. `*/30 * * * *` for twice hourly).

---

## API keys on the Pages project

The **Pages** project needs API keys in its env for the data sources you use:

| Area | Env key | Notes |
|------|---------|--------|
| Sports | `THE_ODDS_API_KEY` | Free tier: 500 req/month |
| Stocks | `ALPHA_VANTAGE_API_KEY` | Free: 25 req/day |
| Massive | `MASSIVE_API_KEY` | Massive.com / Polygon.io-style REST; optional second lane for US equities |
| Crypto | `COINGECKO_API_KEY` (optional) | Public API rate-limited; Pro key helps |
| Weather | `OPENWEATHER_API_KEY` or `WEATHERAPI_API_KEY` | Free tiers |
| News | `GNEWS_API_KEY`, `PERIGON_API_KEY`, `NEWSAPI_AI_KEY`, `NEWSDATA_API_KEY` | Per plan |
| Macro / gov / science | `FRED_API_KEY`, `FINNHUB_API_KEY`, `FEC_API_KEY` / `DATA_GOV_API_KEY`, `NASA_API_KEY`, `CONGRESS_GOV_API_KEY`, `BLS_API_KEY` | Per provider |
| Keyless | Frankfurter (FX), USGS (earthquakes) | No keys on Pages |

Without keys, some sources return no events. See **`PREDICTION_MARKETS.md`** for product detail.

---

## Verify automation (no secrets leaked)

After deploy, open (replace with your `SITE_URL`):

`GET https://YOUR_SITE/api/auto-markets?action=probe`

Returns `{ keysPresent: { THE_ODDS_API_KEY: true/false, ... }, seedSources: [...] }` — booleans only, so you can confirm which integrations are configured on **Pages**. Then:

`GET https://YOUR_SITE/api/auto-markets?action=events&source=crypto&limit=2`

If `count` is `0` but `COINGECKO_API_KEY` is false, CoinGecko may still work (public API) unless rate-limited from Cloudflare’s egress IPs.

---

## Troubleshooting

### Where secrets must live

**API keys must be set on the Pages project** that serves your site and `/api/*`, not only on the cron Worker.

- **Pages** → Your project → **Settings** → **Environment variables** (Production and/or Preview).
- The cron Worker only needs **SITE_URL** (and optionally `AUTO_MARKETS_CRON_SECRET`, `AUTO_MARKETS_LIMIT`). It does **not** call the external APIs; it calls your Pages URL. Pages Functions then use **their** env to call The Odds API, Alpha Vantage, etc.

If keys are only on the Worker (or a different project), the API will see empty env for those keys and return 0 events from those sources.

### Why an API can “malfunction” even when the key is set

| Cause | What happens | What to do |
|-------|----------------|------------|
| **Rate limit** | API returns 429 or error; we catch and return `[]` for that source. | Alpha Vantage: 25 req/day. The Odds API: 500 req/month. Reduce `AUTO_MARKETS_LIMIT` or run seed less often. |
| **Invalid or expired key** | API returns 401/403; we catch and return `[]`. | Rotate key in provider dashboard, update Pages env. |
| **Key on wrong project** | Pages Functions don’t see the key (see above). | Add the same secret to **Pages** → Environment variables. |
| **API blocks Cloudflare IPs** | Some providers block datacenter IPs; request fails or is rate-limited. | CoinGecko public API often does this; try Pro key or accept empty crypto. |
| **No data for that moment** | e.g. no upcoming games for the sport key, or empty news for that query. | Normal; next run may have data. |

Use **GET /api/auto-markets?action=probe** (after deploy) to confirm which keys **Pages** sees (`keysPresent`). Then call **GET …?action=events&source=X&limit=2** per source to see if events come back.

### Why “5 sources working” but no markets created today

If manual calls to `?action=events` return events for several sources (e.g. weather, gnews, perigon, newsapi_ai, weatherapi) but **no new markets appear today**, the usual cause is that **seed_all is not running** in production (or not hitting the right deployment).

- **News sources** (gnews, perigon, newsapi_ai, newsdata_io) use **`Date.now()` in the event id**, so each run gets **new** ids and would create new markets every time the cron runs.
- So if the cron were running and calling your **Pages** `/api/auto-markets` with `POST { action: "seed_all", perSourceLimit: 4 }`, you would see new news markets every hour. If you see **zero** new markets today, the cron either: (1) is not deployed or not triggering, (2) is calling the wrong **SITE_URL** (different domain, or preview without DB), or (3) gets a failure (timeout, 5xx) before the API can write markets.

**Stable-id sources** (sports, stocks, weather, crypto) create at most one market per event/game/date. So “working” there can still mean “all events were already in DB” and `created: 0` for that run. That does **not** explain zero new **news** markets if the cron is actually running.

### Checklist

1. **Confirm API keys are on Pages** — Open **GET https://YOUR_SITE/api/auto-markets?action=probe**. Check `keysPresent`.

2. **Confirm cron Worker is deployed and triggering** — Cloudflare Dashboard → **Workers & Pages** → **dice-express-auto-markets-cron** → **Logs**. Filter by Cron trigger. You should see hourly runs and logs like `[auto-markets-cron] seed all created: N bySource: {...}`.

3. **Confirm SITE_URL** — On the **cron Worker**, **Settings** → Variables and Secrets. **SITE_URL** must be the **exact** base URL of the Pages deployment that has the env vars and D1 (production default in repo: **`https://dice.express`**). No trailing slash.

4. **Run seed manually**
   ```bash
   curl -X POST "https://YOUR_SITE/api/auto-markets" \
     -H "Content-Type: application/json" \
     -d '{"action":"seed_all","perSourceLimit":5}'
   ```
   Check the JSON: `count`, `bySource`, `created`, `skipped`.

5. **Optional: cron secret** — If you set **AUTO_MARKETS_CRON_SECRET** on **Pages**, `POST /api/auto-markets` seed actions require a matching `X-Cron-Secret` header. Set the **same** secret on the cron Worker so scheduled runs succeed.

### Integrated sources and typical limits

| Source | Env key | Typical limit / note |
|--------|---------|----------------------|
| Sports | THE_ODDS_API_KEY | 500 req/month (free); cron includes **sports every run** — hourly usage can exceed free tier; use a paid Odds plan or set **AUTO_MARKETS_SOURCE** for testing |
| Stocks | ALPHA_VANTAGE_API_KEY | 25 req/day (free) |
| Crypto | COINGECKO_API_KEY (optional) | Public API rate-limited; Pro key helps |
| Weather | OPENWEATHER_API_KEY, WEATHERAPI_API_KEY | Free tiers |
| News | GNEWS_API_KEY, PERIGON_API_KEY, NEWSAPI_AI_KEY, NEWSDATA_API_KEY | Per plan |
| Other | RAPIDAPI_KEY, MASSIVE_API_KEY | Per-provider |

If a key is set and probe shows `true` but events are still empty, the next step is provider rate limits, key validity, or (for crypto) Cloudflare IP blocking.
