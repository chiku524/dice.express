# Oracle roadmap — Phase 2 implementation guide

Phase 2 covers **political/election APIs** and **multi-oracle selection per market**. This doc outlines what is needed to implement them.

---

## 1. Political / election APIs

**Goal:** Create and resolve prediction markets such as “Will Candidate X win the election?” or “Will Proposition Y pass?”

### What you need

| Item | Description |
|------|-------------|
| **Data source** | An API that provides official or trusted election results (e.g. government election APIs, FEC, or a licensed results provider). |
| **API key / access** | Sign up and obtain an API key or feed access; store in Cloudflare env (e.g. `ELECTION_API_KEY`). |
| **Resolution logic** | In `functions/lib/resolve-markets.mjs`, add a branch for a new oracle type (e.g. `election_api`). Given a market’s `oracleConfig` (e.g. `{ raceId, candidateId, jurisdiction }`), call the API, compare result to the market’s resolution criteria, set `resolvedOutcome` (e.g. “Yes” / “No”). |
| **Event builder** | In `functions/lib/data-sources.mjs`, add e.g. `eventsFromElectionApi(env, opts)`. Return events with `title`, `description`, `resolutionCriteria`, `oracleSource`, `oracleConfig`, `endDate` (e.g. election day). Use English-only, full descriptions. |
| **Cron / seed** | Add a new source key (e.g. `election`) to `AUTO_MARKET_SOURCES` (or call it only around election periods). In the auto-markets API, support `source: 'election'` and call the new event builder. |
| **Display** | Ensure new markets get a display category (e.g. Politics) and source (e.g. `global_events` or a new `elections` source) in `getDisplaySourceAndCategory` in `functions/api/[[path]].js` and in `marketConfig.js` if you add a new Discover category. |

### Optional

- **Polling APIs** (e.g. RealClearPolitics, FiveThirtyEight) for “current odds” style markets; resolution still needs an official result source.
- **News APIs** (already in Phase 1) can be used for “Will [event] be called by [date]?” if you define clear resolution rules.

---

## 2. Multi-oracle selection per market

**Goal:** Let the system (or later, an admin) choose which oracle resolves a given market, instead of inferring it only from the market’s data source.

### What you need

| Item | Description |
|------|-------------|
| **Market payload** | Already have `oracleSource` and `oracleConfig`. Optionally add `oracleSource` to the create-market API so the seed script can set it explicitly (e.g. `oracleSource: 'the_odds_api'` vs `'election_api'`). |
| **Resolution dispatch** | In `resolve-markets.mjs`, resolution already branches on `payload.oracleSource`. Ensure every oracle type has a branch that: fetches data (using `oracleConfig`), compares to `resolutionCriteria` or outcome list, sets `resolvedOutcome`. |
| **UI (optional)** | Market detail page can show “Resolved by: [Oracle name]” and “Resolution criteria: …”. No change required for multi-oracle to work; only backend resolution and payload need to support multiple oracle types. |
| **New oracle types** | For each new API (e.g. election), add: (1) event builder in `data-sources.mjs`, (2) resolution branch in `resolve-markets.mjs`, (3) display mapping in `getDisplaySourceAndCategory` and `marketConfig.js` if needed. |

### Summary

- **Phase 2a (Elections):** New API client + event builder + resolution branch + env var + seed path.
- **Phase 2b (Multi-oracle):** Already supported by `oracleSource` + `oracleConfig`; add new oracle types as above and optionally expose oracle choice in admin or seed config.

No schema change is strictly required for Phase 2; existing `oracleSource` and `oracleConfig` on the market payload are enough. Add new sources and resolution branches as you onboard new APIs.
