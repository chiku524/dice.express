# Oracle Strategy for Prediction Markets (dice.express)

## Overview

Oracles are the **sources of truth** used to resolve markets. This app uses two complementary layers:

1. **Server-side automated resolution** — Cron / `POST /api/resolve-markets` calls `functions/lib/resolve-markets.mjs`, which reads each market’s `oracleSource` + `oracleConfig` and fetches the matching API (The Odds API, Alpha Vantage, CoinGecko, Massive, FRED, weather, news, etc.). This is the primary path for **auto-markets** created from `functions/lib/data-sources.mjs`.
2. **UI / manual checks** — **RedStone** (and optional proxies) power the **Market Resolution** helper and `GET /api/oracle` for quick price lookups when operators adjudicate or sanity-check financial/crypto markets.

Prediction styles (binary, multi-outcome, **scalar buckets**, **conditional** Yes/No with optional `parentMarketId`) are described in the create-market UI and stored on the market payload; **resolution** still depends on explicit `resolutionCriteria` and, for automated markets, the configured upstream API.

---

## 1. Automated resolution (production)

**Code:** `functions/lib/resolve-markets.mjs` (orchestration), `functions/lib/data-sources.mjs` (HTTP clients).

**Typical flow:** Auto-markets seed with `oracleSource` / `oracleConfig` set from the event builder. After the market’s due date (or event time), resolution compares live API data to thresholds and sets the winning outcome (`Yes` / `No` or multi-outcome string where supported).

| Source key (`oracleSource`) | Role | Env / notes |
|------------------------------|------|-------------|
| `the_odds_api` | Sports winners | `THE_ODDS_API_KEY` |
| `alpha_vantage` | Stock price vs threshold | `ALPHA_VANTAGE_API_KEY` |
| `massive` | Stock daily close vs threshold | `MASSIVE_API_KEY` (Massive.com / Polygon.io REST; `apiKey` query param) |
| `coingecko` | Crypto price vs threshold | Optional `COINGECKO_API_KEY` |
| `openweathermap` / `weatherapi` | Rain / forecast | `OPENWEATHER_API_KEY` / `WEATHERAPI_API_KEY` |
| `fred` | Macro series | `FRED_API_KEY` |
| `finnhub` | Earnings vs EPS | `FINNHUB_API_KEY` |
| `frankfurter` | FX rate | Keyless |
| `usgs` | Earthquake counts | Keyless |
| `fec` / `openfec` | FEC leadership | `FEC_API_KEY` or `DATA_GOV_API_KEY` |
| `nasa_neo` | NeoWs counts | `NASA_API_KEY` or `DATA_GOV_API_KEY` |
| `congress_gov` | Bill feed count | `CONGRESS_GOV_API_KEY` or `DATA_GOV_API_KEY` |
| `bls` | CPI / series | `BLS_API_KEY` |
| `gnews`, `perigon`, `newsapi_ai`, `newsdata_io` | News / headline rules | Per-provider keys |
| `operator_manual` | Custom news (**`customType`** binary; **MultiOutcome** uses label scoring) | News search + heuristics → **Yes** / **No** / winning outcome string / **Void**. Throttle: **`OPERATOR_MANUAL_NEWS_MIN_INTERVAL_MS`**. See **`docs/OPERATOR_MANUAL_RESOLUTION.md`**. |

**Probe which keys are set (booleans only):** `GET /api/auto-markets?action=probe` → `keysPresent`.

**Related docs:** `docs/PREDICTION_MARKETS.md`, `docs/AUTO_MARKETS.md`, `docs/OPERATOR_MANUAL_RESOLUTION.md` (operator-manual / **`customType`** markets).

---

## 2. RedStone (UI / operator assist)

**Status:** ✅ Implemented for **browser-side** price fetch.

**What it provides:** Aggregated price feeds for crypto, equities, and other symbols RedStone lists.

**Usage:** `frontend/src/services/oracleService.js` → `GET /api/oracle?symbol=…` (proxy) or direct RedStone URL in dev.

**Limitations:** Not wired as the default resolver for auto-markets; use it for **manual** resolution workflows and spot checks. For **on-chain-style** certainty on seeded markets, prefer the dedicated source in the table above (e.g. Massive or Alpha Vantage for US equities).

---

## 3. Category → preferred oracle (guidance)

| Category | Preferred automated source | Trust notes |
|----------|----------------------------|-------------|
| Sports | The Odds API | Official scores after `completed` |
| US equities (threshold / close) | Massive or Alpha Vantage | Massive: daily aggregates; AV: global quote |
| Crypto | CoinGecko | Public tier rate-limited |
| Weather | OpenWeatherMap / WeatherAPI | Match city + calendar day in criteria |
| Macro | FRED | Series id + date |
| Politics / gov | OpenFEC, Congress.gov, BLS | Keys per provider |
| News / topics | GNews, Perigon, NewsAPI.ai, NewsData.io | Often rule-based or feed continuation |

---

## 4. Scalar and conditional markets

- **Scalar (range buckets):** **Multi-outcome** market: creators list discrete buckets (e.g. “Under 2%”, “2–4%”, “Over 4%”). Optional `scalarSpec` (`min`, `max`, `unit`) is stored for documentation and tooling; **resolution** must still be defined in `resolutionCriteria` (often manual or a custom oracle).
- **Conditional (Yes/No):** Still **binary** for trading and pool math. Optional `parentMarketId` links to another market id for **operators** and narrative clarity; resolution logic is unchanged unless you add custom code paths.

---

## 5. Security, cost, and hygiene

1. **Secrets:** API keys only in Cloudflare env / `wrangler secret` — never in repo.
2. **Rate limits:** Seed and resolve paths should stay within provider quotas; `seed_all` runs many sources in parallel.
3. **Validation:** Resolvers should refuse to settle before the configured end date / event time.
4. **Multi-oracle:** For high-stakes markets, consider duplicating criteria across two providers (future enhancement).

---

## 6. Phase 2 roadmap (political / election APIs & multi-oracle)

Phase 2 covers **political/election APIs** and **multi-oracle selection per market**. This section outlines what is needed to implement them.

### 6.1 Political / election APIs

**Goal:** Create and resolve prediction markets such as “Will Candidate X win the election?” or “Will Proposition Y pass?”

#### What you need

| Item | Description |
|------|-------------|
| **Data source** | An API that provides official or trusted election results (e.g. government election APIs, FEC, or a licensed results provider). |
| **API key / access** | Sign up and obtain an API key or feed access; store in Cloudflare env (e.g. `ELECTION_API_KEY`). |
| **Resolution logic** | In `functions/lib/resolve-markets.mjs`, add a branch for a new oracle type (e.g. `election_api`). Given a market’s `oracleConfig` (e.g. `{ raceId, candidateId, jurisdiction }`), call the API, compare result to the market’s resolution criteria, set `resolvedOutcome` (e.g. “Yes” / “No”). |
| **Event builder** | In `functions/lib/data-sources.mjs`, add e.g. `eventsFromElectionApi(env, opts)`. Return events with `title`, `description`, `resolutionCriteria`, `oracleSource`, `oracleConfig`, `endDate` (e.g. election day). Use English-only, full descriptions. |
| **Cron / seed** | Add a new source key (e.g. `election`) to `AUTO_MARKET_SOURCES` (or call it only around election periods). In the auto-markets API, support `source: 'election'` and call the new event builder. |
| **Display** | Ensure new markets get a display category (e.g. Politics) and source in `getDisplaySourceAndCategory` in `functions/api/[[path]].js` and in `marketConfig.js` if you add a new Discover category. |

#### Optional

- **Polling APIs** (e.g. RealClearPolitics, FiveThirtyEight) for “current odds” style markets; resolution still needs an official result source.
- **News APIs** (already in Phase 1) can be used for “Will [event] be called by [date]?” if you define clear resolution rules.

### 6.2 Multi-oracle selection per market

**Goal:** Let the system (or later, an admin) choose which oracle resolves a given market, instead of inferring it only from the market’s data source.

#### What you need

| Item | Description |
|------|-------------|
| **Market payload** | Already have `oracleSource` and `oracleConfig`. Optionally add `oracleSource` to the create-market API so the seed script can set it explicitly (e.g. `oracleSource: 'the_odds_api'` vs `'election_api'`). |
| **Resolution dispatch** | In `resolve-markets.mjs`, resolution already branches on `payload.oracleSource`. Ensure every oracle type has a branch that: fetches data (using `oracleConfig`), compares to `resolutionCriteria` or outcome list, sets `resolvedOutcome`. |
| **UI (optional)** | Market detail page can show “Resolved by: [Oracle name]” and “Resolution criteria: …”. No change required for multi-oracle to work; only backend resolution and payload need to support multiple oracle types. |
| **New oracle types** | For each new API (e.g. election), add: (1) event builder in `data-sources.mjs`, (2) resolution branch in `resolve-markets.mjs`, (3) display mapping in `getDisplaySourceAndCategory` and `marketConfig.js` if needed. |

#### Summary

- **Phase 2a (Elections):** New API client + event builder + resolution branch + env var + seed path.
- **Phase 2b (Multi-oracle):** Already supported by `oracleSource` + `oracleConfig`; add new oracle types as above and optionally expose oracle choice in admin or seed config.

No schema change is strictly required for Phase 2; existing `oracleSource` and `oracleConfig` on the market payload are enough. Add new sources and resolution branches as you onboard new APIs.

---

## 7. Conclusion

**Automated** resolution is **implemented** for the sources listed in §1. **RedStone** remains useful for **manual** adjudication and quick price display. **Massive** complements Alpha Vantage for **US stock** threshold markets when `MASSIVE_API_KEY` is set. Extend `data-sources.mjs` + `resolve-markets.mjs` when adding new provider families.
