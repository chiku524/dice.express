# Prediction Markets: Styles, Topics/APIs & Automated Creation

This doc covers **prediction styles** (Yes/No, True/False, Multi-outcome, etc.), **free/cheap APIs** by topic (sports, weather, crypto, news), and **automated market creation** (cron Worker, no user-created markets).

---

# Part 1 — Prediction styles

Markets support multiple **prediction styles** so users can trade on different kinds of questions. Resolution and UI follow the style.

## Style definitions

| Style | Description | Outcomes | Example |
|-------|-------------|----------|---------|
| **Binary (Yes/No)** | Two outcomes; user bets Yes or No. | Yes, No | "Will BTC be above $100,000 on 2025-12-31?" |
| **True/False** | Same as binary; semantic variant for fact/knowledge. | True, False | "True or False: The Earth is flat." |
| **Happens / Doesn't** | Event either happens or doesn't by a deadline. | Happens, Doesn't | "Will it rain in NYC on 2025-06-15?" |
| **Multi-Outcome** | N mutually exclusive outcomes; exactly one wins. | User-defined list | "Who will win the election? A / B / C / Other." |
| **Scalar / Range** (future) | Numeric outcome in a range; payouts by band or formula. | Bands or continuous | Temperature, etc. |
| **Conditional** (future) | Resolves only if a condition is met; otherwise refund. | Depends on parent market | "If A wins primary, will B win general?" |

**Resolution:** Binary styles resolve to one of the two outcome strings; winning side gets payout per share. Multi-outcome resolves to exactly one of the outcome list; that outcome’s positions win.

**Categories / topics:** Filter and browse by category (Finance, Sports, Politics, Weather, Entertainment, Crypto, etc.). Map category to oracle (see ORACLE_STRATEGY.md).

---

# Part 2 — APIs for prediction topics (free & cheap)

To attract users with interesting markets, the platform resolves outcomes using external data. Below are **free or low-cost** APIs by topic.

## Crypto & finance

| API | Purpose | Cost | Notes |
|-----|---------|------|--------|
| **RedStone** | Crypto (and other) prices | Free tier | `GET /api/oracle?symbol=BTC` |
| **CoinGecko** | Crypto prices, market cap | Free (rate limited) | Simple price endpoint |
| **Alpha Vantage** | Stocks, forex, crypto | Free key, 25 req/day | "Will AAPL close above $X?" |
| **Twelve Data** | Stocks, forex, crypto | Free tier (800 req/day) | REST + websockets |

## Sports

| API | Purpose | Cost | Notes |
|-----|---------|------|--------|
| **The Odds API** | Odds and game results (many sports) | Free tier (500 req/month) | Results for "Will Team X win?" |
| **API-Football** (RapidAPI) | Football/soccer scores | Free tier | Leagues, matches, results |
| **API-NBA** (RapidAPI) | NBA stats and scores | Free tier | Games, scores |
| **ESPN Public API** | Scores (unofficial, no key) | Free | Non-critical resolution |
| **SportsDataIO** | Multi-sport | Paid ~$50/mo | Reliable at scale |

## Weather

| API | Purpose | Cost | Notes |
|-----|---------|------|--------|
| **OpenWeatherMap** | Current and forecast | Free tier (1000 req/day) | "Will it rain in NYC on date X?" |
| **WeatherAPI.com** | Weather, history, forecast | Free tier (1M req/month) | Good free tier |
| **NOAA** | US official weather | Free | US only, no key |
| **Open-Meteo** | Weather (no key) | Free | Temperature in city X |

## News & politics

| API | Purpose | Cost | Notes |
|-----|---------|------|--------|
| **NewsAPI** | Headlines and articles | Free dev (1000 req/day) | "Did event X happen by date?" |
| **NewsAPI.ai** | News search (Event Registry) | Free tier | Integrated; env: `NEWSAPI_AI_KEY` |
| **GNews** | News search | Free tier | Alternative to NewsAPI |
| **Guardian** | News (open API) | Free | UK/international |
| **Perigon** | Topic search | Free tier | `PERIGON_API_KEY` |
| **NewsData.io** | Latest news by query | Free tier | Integrated; env: `NEWSDATA_API_KEY` |

Election results: prefer **official election APIs** (e.g. government or FEC) where available.

## Implementation pattern

- **Resolution source** per market: e.g. `oracleSource: 'redstone' | 'openweather' | 'the-odds-api' | 'manual'`.
- Backend job or on-demand: call the right API, compare to market criteria, set `resolvedOutcome`.
- Store API keys in Cloudflare env (e.g. `OPENWEATHER_API_KEY`, `THE_ODDS_API_KEY`). Use free tiers first.

---

# Part 3 — Automated market creation

**Users cannot create prediction markets.** All markets are created automatically from external events using the integrated APIs. The only triggers are the **cron Worker** and optional **manual API calls** by you.

## What triggers market creation

| Trigger | What it does | When |
|--------|----------------|------|
| **Cron Worker** (`dice-express-auto-markets-cron`) | Calls `POST /api/auto-markets` with **seed_all** (or single `source` if **AUTO_MARKETS_SOURCE** is set), then `POST /api/resolve-markets`. Only new event IDs create markets; existing are skipped. | **Every hour** by default (`workers/auto-markets-cron/wrangler.toml` → `crons`). |
| **Manual API call** | You call `POST /api/auto-markets` with `action: "seed"` + `source`, or `action: "seed_all"`, or `sources: ["sports", "stocks", ...]`. | Whenever you want. |

There is **no UI** and **no public API** for users to create markets. The route `/create` shows that markets are automated and links to "Browse markets".

## How creation works

1. Cron Worker runs and sends **POST** to **/api/auto-markets**:
   - **Default:** `{ "action": "seed_all", "perSourceLimit": 5 }` — tries all integrated sources (sports, stocks, stocks_trend, crypto, crypto_trend, weather, weatherapi, news, perigon, newsapi_ai, newsdata_io). Sources without an API key are skipped.
   - **Single source:** If **AUTO_MARKETS_SOURCE** is set (e.g. `sports`), body is `{ "action": "seed", "source": "sports", "limit": 5 }`.
2. API loads **events** from the chosen source(s). For each event it uses a stable **market ID**. It **only creates a market if that ID doesn't already exist**. New events → new markets; existing → skipped.
3. For each *new* event the API creates a **market** and **liquidity pool**, stores them in D1 and backs up to R2. Automated markets use **`settlementTrigger: { tag: "EventBased", value: "<summary>" }`** (outcome/event-driven), not time-only or manual; **`resolutionDeadline`** still reflects the oracle window (e.g. game time or last trading day).
4. **POST /api/resolve-markets** (called by the same cron after seeding) resolves due markets and settles winners (2% fee).

## Categories and APIs (what gets created)

| Source | API | Env key (Pages) | Notes |
|--------|-----|------------------|--------|
| **sports** | The Odds API | `THE_ODDS_API_KEY` | NBA, NFL, etc. |
| **stocks** | Alpha Vantage | `ALPHA_VANTAGE_API_KEY` | "Will X close above $Y by date?" (7-day). |
| **massive** | Massive.com (Polygon.io REST) | `MASSIVE_API_KEY` | Same style as stocks; daily aggregate close vs threshold; optional `MASSIVE_API_BASE`. |
| **stocks_trend** | Alpha Vantage | `ALPHA_VANTAGE_API_KEY` | Trend: "Will [symbol] close above $X by [Friday]?" (current × 1.02). |
| **crypto** / **coingecko** | CoinGecko | (optional) `COINGECKO_API_KEY` | "Will X be above $Y by date?" |
| **crypto_trend** | CoinGecko | (optional) `COINGECKO_API_KEY` | "Will [symbol] be above $X in 24h?" (current × 1.02). |
| **weather** / **openweather** | OpenWeatherMap | `OPENWEATHER_API_KEY` | "Will it rain in [city] on [date]?" |
| **weatherapi** | WeatherAPI.com | `WEATHERAPI_API_KEY` | Same style. |
| **news** / **gnews** | GNews | `GNEWS_API_KEY` | Headline/topic markets. |
| **perigon** | Perigon | `PERIGON_API_KEY` | Topic search. |
| **newsapi_ai** | NewsAPI.ai | `NEWSAPI_AI_KEY` | Topic search. |
| **newsdata_io** | NewsData.io | `NEWSDATA_API_KEY` | Latest news by query (English). |

**News → outcome markets (automatic):** On each seed, `promoteNewsArticleToOutcomeMarket` runs first. Headlines that mention a **known ticker**, **earnings**, **Fed/macro**, or **major crypto** can become **price / Finnhub / FRED** markets (checkable oracles). Everything else used to become **feed-topic** markets (“headline still appears in this API feed”). **Those feed-topic markets are now skipped by default** so you are not flooded with Motley-Fool-style titles unless you opt in. Set **`AUTO_MARKETS_ALLOW_FEED_TOPIC=1`** in Cloudflare (or `.dev.vars`) to create them again. Confirm policy with `GET /api/auto-markets?action=probe` → `autoMarketsPolicy.skipFeedTopicHeadlineMarkets`.

Sources without a key are skipped when using **seed_all**. Set **AUTO_MARKETS_SOURCE** to a single source (e.g. `sports`) to seed only that category.

**Why do I only see Sports markets?** Markets are only created for sources that have an API key configured on the **Pages** project (Cloudflare env). If only `THE_ODDS_API_KEY` is set, only sports markets will be created. To get Finance/Crypto, Weather, or News markets, add the corresponding keys (e.g. `ALPHA_VANTAGE_API_KEY`, `COINGECKO_API_KEY`, `OPENWEATHER_API_KEY`, `WEATHERAPI_API_KEY`, `GNEWS_API_KEY`, `PERIGON_API_KEY`, `NEWSAPI_AI_KEY`, `NEWSDATA_API_KEY`) in Cloudflare Pages → Settings → Environment variables, then run the cron again or trigger a manual seed.

## Auto-markets API (endpoints & params)

| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/api/auto-markets?action=events&source=...&limit=10` | List events from the given source. |
| POST | `/api/auto-markets` | Create markets from events. Body: `{ "action": "seed", "source": "...", "limit": 10 }` or `{ "action": "seed_all", "perSourceLimit": 5 }` or `{ "sources": ["sports", "stocks_trend"], "perSourceLimit": 5 }`. |

**Parameters:** `action` (events / seed / seed_all), `source`, `sources` (array), `limit`, `perSourceLimit`, `sport` (for sports), `category` (for news), `q` (Perigon/NewsAPI.ai query).

**Environment variables:** Set in Cloudflare Pages/Workers. Examples: `THE_ODDS_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `MASSIVE_API_KEY`, `OPENWEATHER_API_KEY`, `WEATHERAPI_API_KEY`, `GNEWS_API_KEY`, `PERIGON_API_KEY`, `NEWSAPI_AI_KEY`, `NEWSDATA_API_KEY`, optional `COINGECKO_API_KEY`, `RAPIDAPI_KEY`.

## Viewing markets on the webapp

| Where | What you see |
|-------|----------------|
| **Discover → All Markets** | Every market; use Source and Category filters. |
| **Discover → Global Events** | Sports, weather, news/headline markets. |
| **Discover → Industry Topics** | Stocks and crypto markets. |

**Category filter:** Sports, Weather, Finance, Crypto, News, Other. Markets are tagged so you can filter. Deploy the cron Worker: `cd workers/auto-markets-cron && npx wrangler deploy`. Set **SITE_URL** (and optional **THE_ODDS_API_KEY** on the Pages project for sports). See **GET_APP_UP_AND_RUNNING.md** for full setup.

## User-facing behavior

- **/create** → "Markets are automated" and link to browse markets. No create form.
- **POST /api/markets** with `source: 'user'` (or no source) → **403** "User-created markets are disabled."
- Only **POST /api/auto-markets** (seed / seed_all / sources) can create markets.

All live markets come from the automated pipeline (cron + integrated APIs), not from users.
