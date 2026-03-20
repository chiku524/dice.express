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
| **AUTO_MARKETS_SOURCE** | No | If unset, **seed_all** runs (all sources with API keys). Set to e.g. `sports` to seed only that source. Options: `sports`, `stocks`, `crypto`, `weather`, `openweather`, `weatherapi`, `news`, `gnews`, `perigon`, `newsapi_ai`. |
| **AUTO_MARKETS_LIMIT** | No | Max markets per source per run when using seed_all (default `4` in wrangler.toml, max 20). Kept low to stay within free-tier rate limits (e.g. Alpha Vantage 25 req/day). |
| **AUTO_MARKETS_CRON_SECRET** | No | If set, the Worker sends it as `X-Cron-Secret`; you can later protect `/api/auto-markets` with this header. |

## Cron schedule

Default: **every hour** (`0 * * * *`). Each run (1) seeds new markets, then (2) calls **POST /api/resolve-markets**.

**Quota-friendly behavior:** Sports (The Odds API, 500 req/month) is included only at **UTC 08:00**; all other hours seed stocks, crypto, weather, and news only. Alpha Vantage (stocks) uses 1 symbol per run to stay under 25 req/day. Event fetches run in parallel to avoid timeouts. Edit `wrangler.toml` → `[triggers]` → `crons` to change (e.g. `0 */6 * * *` every 6 hours).

## API keys (on the Pages project, not this Worker)

The **Pages** project needs API keys in its env for the data sources you use:

- **sports:** `THE_ODDS_API_KEY` (free tier: 500 req/month)
- **stocks:** `ALPHA_VANTAGE_API_KEY` (free: 25 req/day)
- **crypto:** CoinGecko works without a key (rate limited); or `COINGECKO_API_KEY`
- **weather:** `OPENWEATHER_API_KEY` or `WEATHERAPI_API_KEY` (free tiers)
- **news:** `GNEWS_API_KEY`, `PERIGON_API_KEY`, `NEWSAPI_AI_KEY`, or `NEWSDATA_API_KEY` (NewsData.io)

Without keys, some sources will fail; **sports** with The Odds API key is the most common for free. See `docs/PREDICTION_MARKETS.md`.

## Verify automation (no secrets leaked)

After deploy, open (replace with your `SITE_URL`):

`GET https://YOUR_SITE/api/auto-markets?action=probe`

Returns `{ keysPresent: { THE_ODDS_API_KEY: true/false, ... }, seedSources: [...] }` — booleans only, so you can confirm which integrations are configured on **Pages**. Then:

`GET https://YOUR_SITE/api/auto-markets?action=events&source=crypto&limit=2`

If `count` is `0` but `COINGECKO_API_KEY` is false, CoinGecko may still work (public API) unless rate-limited from Cloudflare’s egress IPs.
