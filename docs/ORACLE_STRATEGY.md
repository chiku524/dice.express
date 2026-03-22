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
| `operator_manual` | Never auto-resolves | Manual only |

**Probe which keys are set (booleans only):** `GET /api/auto-markets?action=probe` → `keysPresent`.

**Related docs:** `docs/PREDICTION_MARKETS.md`, `workers/auto-markets-cron/README.md`.

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

## 6. Conclusion

**Automated** resolution is **implemented** for the sources listed in §1. **RedStone** remains useful for **manual** adjudication and quick price display. **Massive** complements Alpha Vantage for **US stock** threshold markets when `MASSIVE_API_KEY` is set. Extend `data-sources.mjs` + `resolve-markets.mjs` when adding new provider families.
