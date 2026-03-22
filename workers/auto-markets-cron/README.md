# Auto-markets cron Worker

Calls your dice.express Pages API on a schedule to **seed automated prediction markets** (sports, crypto, stocks, weather, etc.). Uses **free-tier APIs** (The Odds API, CoinGecko, Alpha Vantage, OpenWeather, etc.) — no cost within their limits.

## Deploy

```bash
cd workers/auto-markets-cron
npx wrangler deploy
```

## Environment

Set in Cloudflare Dashboard → Workers & Pages → dice-express-auto-markets-cron → Settings → Variables and Secrets:

| Variable | Required | Description |
|----------|----------|-------------|
| **SITE_URL** | Yes | Your site base URL (e.g. `https://dice-express.pages.dev` or your custom domain). No trailing slash. |
| **AUTO_MARKETS_SOURCE** | No | If **unset**, the Worker runs **seed_all** with the full source list (see `index.js`). If **set** (e.g. `sports`), only that single source runs each hour — use for debugging, not for “use all keys”. |
| **AUTO_MARKETS_LIMIT** | No | Per-source cap for **non-news** APIs (default `25` in `wrangler.toml`, hard max `100` in API). Lower (e.g. `4`) reduces markets per run and API usage; it does **not** control news volume (see next row). |
| **AUTO_MARKETS_NEWS_LIMIT** | No | Per-source cap for **news / enriched** sources (`news`, `perigon`, `newsapi_ai`, `newsdata_io`). Default `50` when unset in Worker env. |
| **AUTO_MARKETS_CRON_SECRET** | No | If set on the **Worker**, every seed request sends `X-Cron-Secret`. If you set the **same** variable on the **Pages** project (`AUTO_MARKETS_CRON_SECRET`), `POST /api/auto-markets` seed actions **require** a matching header (401 otherwise). Use both together for production. |

## Cron schedule

Default: **every hour** (`0 * * * *`). Each run (1) seeds new markets, then (2) calls **POST /api/resolve-markets**.

**Quota-friendly behavior:** Sports (The Odds API, 500 req/month) is included only at **UTC 08:00**; other hours seed all other integrated lanes (stocks, crypto, weather, Frankfurter, USGS, FEC, NASA, Congress.gov, BLS, FRED, Finnhub, news providers). Alpha Vantage (stocks) still uses one symbol per run in code. Fetches run in parallel. Edit `wrangler.toml` → `[triggers]` → `crons` to change cadence.

## API keys (on the Pages project, not this Worker)

The **Pages** project needs API keys in its env for the data sources you use:

- **sports:** `THE_ODDS_API_KEY` (free tier: 500 req/month)
- **stocks:** `ALPHA_VANTAGE_API_KEY` (free: 25 req/day)
- **massive:** `MASSIVE_API_KEY` (Massive.com / Polygon.io-style REST; optional second lane for US equities)
- **crypto:** CoinGecko works without a key (rate limited); or `COINGECKO_API_KEY`
- **weather:** `OPENWEATHER_API_KEY` or `WEATHERAPI_API_KEY` (free tiers)
- **news:** `GNEWS_API_KEY`, `PERIGON_API_KEY`, `NEWSAPI_AI_KEY`, `NEWSDATA_API_KEY`
- **macro / gov / science:** `FRED_API_KEY`, `FINNHUB_API_KEY`, `FEC_API_KEY` / `DATA_GOV_API_KEY`, `NASA_API_KEY`, `CONGRESS_GOV_API_KEY`, `BLS_API_KEY`
- **keyless:** Frankfurter (FX), USGS (earthquakes) — no keys on Pages

Without keys, some sources will fail; **sports** with The Odds API key is the most common for free. See `docs/PREDICTION_MARKETS.md`.

## Verify automation (no secrets leaked)

After deploy, open (replace with your `SITE_URL`):

`GET https://YOUR_SITE/api/auto-markets?action=probe`

Returns `{ keysPresent: { THE_ODDS_API_KEY: true/false, ... }, seedSources: [...] }` — booleans only, so you can confirm which integrations are configured on **Pages**. Then:

`GET https://YOUR_SITE/api/auto-markets?action=events&source=crypto&limit=2`

If `count` is `0` but `COINGECKO_API_KEY` is false, CoinGecko may still work (public API) unless rate-limited from Cloudflare’s egress IPs.
