# Changelog & Improvements

Summary of major cleanups and improvements. For current structure see [README](../README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1.0.39 — Near-black background (April 2026)

- **Release:** Version **1.0.39**; tag **`v1.0.39`** for desktop CI and GitHub Releases.
- **Frontend:** **`AnimatedBackground`** base and stone stops darkened toward **near black** (#020203 family); softer radial lifts, black vignette overlay, lighter grain; engraved vein strokes and SVG opacity tuned to match.

## 1.0.38 — Boing-style backdrop + desktop background (April 2026)

- **Release:** Version **1.0.38**; tag **`v1.0.38`** for desktop CI and GitHub Releases.
- **Frontend:** Full-viewport background reworked toward **boing.express**-style cool stone slab, scratch hatching, grain, floating neon orbs/arcs/dashes/dots, and subtler engraved veins with motion.
- **Desktop (Tauri):** **`AnimatedBackground`** now mounts in the main shell (was web/auth-only); **`app--desktop-shell`** background is **transparent** so the backdrop is visible behind the sidebar and content.

## 1.0.37 — Engraved stone background (April 2026)

- **Release:** Version **1.0.37**; tag **`v1.0.37`** for desktop CI and GitHub Releases.
- **Frontend / desktop:** Replaced the canvas prediction-market animated background with an **engraved stone** SVG treatment — one continuous carved path, neon glow accents, motion along the groove, subtle parallax, and stone texture. **Tauri** bundles the same `frontend/dist` via `build:frontend:tauri`, so the desktop app picks this up automatically.

## 1.0.33 — Desktop docs layout (April 2026)

- **Release:** Version **1.0.33**; tag **`v1.0.33`** for desktop CI and GitHub Releases.
- **Desktop app:** Documentation page (`/docs`) hides the in-page **Contents** column; the sidebar **Documentation** flyout is the only TOC. Web layout unchanged.

## 1.0.32 — Auto-markets pipeline, pending activation, CI & docs (April 2026)

- **Release:** Version **1.0.32**; tag **`v1.0.32`** for CI and GitHub Releases.
- **Auto-markets:** **`AUTO_MARKETS_PENDING_ACTIVATION`** stores new markets as **AutoPending** (no pool until promotion); **`POST /api/auto-markets`** **`activate_pending`** validates and promotes to **Active** or **AutoRejected**; KV **source health** pause via **`AUTO_MARKETS_PAUSE_AFTER_CONSECUTIVE_FAILURES`**; **stable content fingerprint** on **`payload.autoMarketCreation`**; richer seed/probe responses and **`appendSeedRunHistory`**; optional Worker **`AUTO_MARKETS_CRON_ACTIVATE_PENDING`**; **`predictionLog`** import fix on **`prediction-maintenance`**.
- **Frontend:** Automation status shows activation queue and pending sample; market link/share helpers and related Discover/detail polish; status styling for **AutoPending** / **AutoRejected**.
- **Tests:** **`auto-market-seed`**, **`auto-market-activation`**, deadline/resolve-queue, **`market-links`**.

## CI, API router split, E2E, and ops (April 2026)

- **CI:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs root unit tests, frontend ESLint, production build, Playwright smoke (Chromium), on PRs and pushes to `main`. Deploy workflow runs the same checks before upload; static `frontend/dist` is passed as an artifact to the deploy job.
- **API:** [`functions/api/handle-d1.mjs`](../functions/api/handle-d1.mjs) dispatches to [`functions/api/routes/d1-*.mjs`](../functions/api/routes/) (public, deposits, withdrawals, orders, markets, resolve, etc.); shared helpers in [`functions/api/lib/d1-shared.mjs`](../functions/api/lib/d1-shared.mjs). [`functions/api/[[path]].js`](../functions/api/[[path]].js) is the Pages entry (proxy + `X-Request-Id`). [`functions/api/lib/api-http.mjs`](../functions/api/lib/api-http.mjs) for CORS/JSON responses.
- **Observability:** JSON error bodies and `predictionLog` batch events include correlation via `requestId` / `httpRequestId` where applicable; `GET /api/health` exposes `privilegedRoutesGated`.
- **Tests:** [`tests/market-config-deadline.test.mjs`](../tests/market-config-deadline.test.mjs), [`tests/resolve-markets-due.test.mjs`](../tests/resolve-markets-due.test.mjs). **E2E:** [`e2e/smoke.spec.mjs`](../e2e/smoke.spec.mjs), [`playwright.config.mjs`](../playwright.config.mjs), root `npm run test:e2e` / `test:e2e:install`.
- **Ops / data:** Production secrets checklist lives in [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) (Part 3); optional SQL notes in [`schema/d1/optional_backfill_resolution_deadline_utc_end.sql`](../schema/d1/optional_backfill_resolution_deadline_utc_end.sql).

## Documentation consolidation (April 2026)

- **[APPLICATION.md](./APPLICATION.md)** — single “start here” overview for the product and stack.
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — merges former **CLOUDFLARE.md**, **GET_APP_UP_AND_RUNNING.md**, and the standalone production secrets checklist.
- **[USER_FLOWS_TRADING_AND_RISK.md](./USER_FLOWS_TRADING_AND_RISK.md)** — merges **USER_FLOW_AND_RISK_AUDIT.md** and **ALGORITHMS_AND_RISK.md**.
- **[OPERATOR_MANUAL_RESOLUTION.md](./OPERATOR_MANUAL_RESOLUTION.md)** — now includes the full tuning playbook (removed **OPERATOR_MANUAL_TUNING.md**).
- **[AUTO_MARKETS.md](./AUTO_MARKETS.md)** — adds the operator playbook section (removed **PREDICTION_OPS_PLAYBOOK.md**).
- **[HISTORICAL_CANTON_DAML_API.md](./HISTORICAL_CANTON_DAML_API.md)** — Canton/DAML reference split out of **API.md**.
- **PLATFORM_VISION_AND_ROADMAP.md** — adds a short “production implementation (today)” subsection; **VIRTUAL_CURRENCY_AND_MULTICHAIN.md** removed as a standalone file.
- **Frontend:** ESLint React Compiler rules — [`LoadingDiceProgress`](../frontend/src/components/LoadingDiceProgress.jsx) drops redundant `useMemo`; [`MultiDiceLoader`](../frontend/src/components/MultiDiceLoader.jsx) moves `Math.random` jitter into `useEffect` so render stays pure.

## 1.0.31 — Loading dice 3D read (March 2026)

- **Release:** Version **1.0.31**; tag **`v1.0.31`** for desktop CI and GitHub Releases.
- **Frontend:** **`RollingVectorDie`** per-face SVG shading (top/front/sides/back/bottom) so tumbling reads as a **cube**, not a flat card; **`MultiDiceLoader`** removes **`drop-shadow`** on the animated cube (avoids browser flattening of **`preserve-3d`**), adds **ground shadow** on the die wrap, **tighter perspective** scaled by **`--dice-size`**, face **inset** highlights, slightly **squarer** face corners.

## 1.0.30 — P2P orders, limits, contracts index (March 2026)

- **Release:** Version **1.0.30**; tag **`v1.0.30`** for desktop CI and GitHub Releases.
- **API:** Server-side **sell size** check vs positions and open sells; **`shortfall`** on insufficient Pips for limit buys; **idempotency** for place-order and withdraw (**`Idempotency-Key`** / body); **rate limits** (orders, cancel, get-contracts per party, unscoped get-contracts per IP, withdraw); **KV** with **in-memory RL fallback** when KV is absent; structured **`predictionLog`** for orders, withdraw, deposit credit.
- **Contracts:** **`get-contracts`** optional **`marketId`** filter; D1 migration **`0007_contracts_payload_market_id_index`** (expression index on **`payload.marketId`**).
- **Frontend:** **Max sell** net of resting sells; **your open orders** + **cancel**; book shows **remaining** / partial fills; **Quick trade** panel; **`ordersApi`** idempotency header; **`marketTradeForm`** helpers; **`usePipsBalance`** hook.
- **Tests:** **`p2p-order-validation`**, **`api-rate-limit`**, **`storage-query`** (marketId query).

## 1.0.29 — Odds API fallback key, operator-manual hardening, docs & UI (March 2026)

- **Release:** Version **1.0.29**; tag **`v1.0.29`** for desktop CI and GitHub Releases.
- **Sports:** Optional **`THE_ODDS_API_KEY_FALLBACK`** on Pages — The Odds API calls retry with the fallback key on quota/auth errors (seeding and scores); **`GET .../auto-markets?action=probe`** reports whether the fallback is set.
- **Operator-manual:** **`functions/lib/operator-manual-resolve.mjs`**, **`tests/operator-manual-resolve.test.mjs`**, **`docs/OPERATOR_MANUAL_RESOLUTION.md`**, **`docs/OPERATOR_MANUAL_TUNING.md`**; related **`resolve-markets`** / **`custom-news-markets`** / API updates.
- **Frontend:** **`LoadingDiceProgress`**, **`MultiDiceLoader`** / **`MarketsList`** / **`MarketDetail`** / **`Portfolio`** / **`AutomationStatus`** refinements; **`marketConfig`**, **`marketsApi`**, theme and **`App`** routing.
- **Docs & config:** Broader docs refresh; **`.dev.vars.example`** and **`wrangler.toml`** env comments for **`THE_ODDS_API_KEY_FALLBACK`**.

## Operator-manual resolution documentation (March 2026)

- **`docs/OPERATOR_MANUAL_RESOLUTION.md`** — Operator-manual / **`customType`** markets: **`resolutionDeadline`**, optional **`OPERATOR_MANUAL_RESOLVE_BEFORE_DEADLINE`** on Pages, news keys, hourly cron via **`workers/auto-markets-cron`**, **Yes**/**No**/**Void** settlement and refunds. Includes a **Tuning playbook** (safe staging, per-**`customType`** guidance, **`seedQuery`**/anchor fixes, local regex checks, Preview verification).
- **Cross-links:** `docs/README.md`, `AUTO_MARKETS.md`, `API.md`, `ORACLE_STRATEGY.md`, `GET_APP_UP_AND_RUNNING.md`, root `README.md`, `wrangler.toml` comments, `workers/auto-markets-cron/README.md`, `USER_FLOW_AND_RISK_AUDIT.md`.

## Resolution & settlement hardening (March 2026)

- **Settlement:** Idempotent position credits (`settlementCreditedAt`, **`settlementKind`**, **`settlementPayoutPips`**); **AMM** winner payout **`amount × (1 − fee)`** when **`counterpartyPositionId`** is absent; **Void** refunds unchanged. **`backupToR2`** on position payload updates when R2 is bound.
- **Operator-manual:** **`OPERATOR_MANUAL_NEWS_MIN_INTERVAL_MS`** throttle + **`lastOperatorNewsFetchAt`**; **`predictionLog`** JSON lines; **MultiOutcome** + **`operator_manual`** resolution (outcome label scoring); **`resolveOutcome(env, market, { dryRun })`**.
- **API:** **`POST /api/resolve-markets-preview`** (ops); **`GET .../auto-markets?action=probe`** adds **`resolveQueueSummary`**.
- **Frontend:** Automation status shows due sample; **MarketDetail** **Void** copy and P2P-first note.
- **Docs:** **`docs/OPERATOR_MANUAL_TUNING.md`** (playbook split); **`ALGORITHMS_AND_RISK.md`** settlement section updated.
- **Tests:** **`tests/operator-manual-resolve.test.mjs`**.

## 1.0.28 — Watchlist page, alerts in Profile settings (March 2026)

- **Release:** Version **1.0.28**; tag **`v1.0.28`** for desktop CI and GitHub Releases.
- **UX:** Market alerts UI removed from Discover; **Notification settings** live only under **Profile & settings** (`#notification-settings`).
- **Watchlist:** Dedicated **`/watchlist`** route (starred markets on device), linked from User hub, desktop sidebar, navbar, and dashboard.

## 1.0.27 — Multi-outcome markets, P2P-only toggle, alerts, Tauri native notifications (March 2026)

- **Release:** Version **1.0.27**; tag **`v1.0.27`** for desktop CI and GitHub Releases.
- **Markets & API:** Multi-outcome pool AMM support; `GET /api/public-config` (`ammTradeEnabled`, `tradingMode`, SMS probe); `DISABLE_AMM_TRADE` in **`wrangler.toml`** for operator P2P-only mode; automation heartbeat/probe and related Worker routes; resolve path skips auto-oracle for multi-outcome.
- **Frontend:** Market alerts (browser + Tauri native via **`tauri-plugin-notification`**), watchlist UX, automation status page, multi-dice loaders, portfolio/browse refinements; **`MarketDetail`** respects public config when AMM is off.
- **Desktop:** **`tauri-plugin-notification`** with **`notification:default`** capability; Rust **1.77.2** minimum for the notification crate.

## 1.0.26 — Docs TOC section sync, markets loading spinner (March 2026)

- **Release:** Version **1.0.26**; tag **`v1.0.26`** for desktop CI.
- **Documentation:** TOC and in-app hash navigation now drive the active section via React Router `location` plus `hashchange`/`popstate`, with the main outlet keyed by pathname only so hash changes no longer remount the lazy docs chunk incorrectly.
- **Markets:** Initial markets load uses the shared **`LoadingSpinner`** (dice loader) with optional sublabel; **`LoadingSpinner`** accepts **`sublabel`** for richer copy.

## 1.0.24 — Stack upgrade, cleanup, ops hardening (March 2026)

- **Release:** Version bump across **`package.json`**, **`frontend/`**, **`src-tauri/`**, download fallbacks (`constants/downloads.js`). Tag **`v1.0.24`** triggers desktop build workflow.
- See **Stack upgrade** and prior **Documentation consolidation** / **Fourth pass** entries below for detail.

## 1.0.25 — Docs nav flyout, desktop icons from logo (March 2026)

- **Release:** Version **1.0.25**; tag **`v1.0.25`** for desktop CI. Documentation sections live in the **Documentation** navbar dropdown (hover/click) and desktop sidebar flyout; **`/docs`** is full-width. **Tauri** bundle icons regenerated from **`frontend/public/logo.svg`**.

## Documentation TOC in nav + desktop icons (March 2026)

- **Docs UX:** Section list moved out of the `/docs` page into a **Documentation** dropdown in the web navbar (hover or click) and a **Documentation** flyout in the desktop sidebar. `/docs` content is full-width with a short hint line.
- **Desktop app icons:** Regenerated **`src-tauri/icons/*`** from **`frontend/public/logo.svg`** via `tauri icon` (taskbar, shortcuts, Start menu, macOS/Linux bundles).

## Remove `/admin` UI (March 2026)

- **Product:** Markets are **auto-seeded** (`/api/auto-markets` + cron); the old **`/admin`** screen only approved legacy **`MarketCreationRequest`** rows in D1 and is redundant for the current flow.
- **App:** Deleted **`AdminDashboard`**; **`/admin`** redirects to **`/`**. Docs TOC, product map, SEO entry, and Activity empty-state copy updated. **`docs/API.md`** clarifies that without **`PRIVILEGED_API_SECRET`** / cron secret on Pages, privileged **`POST`** routes (including **`resolve-markets`**) stay **open** and the Worker needs **no** matching secret.

## Stack upgrade (March 2026)

- **Frontend:** **React 19**, **Vite 8**, **React Router 7**, **ESLint 9** with flat config (`frontend/eslint.config.js`). **`manualChunks`** in Vite is a **function** (Rolldown requirement in Vite 8). **`react-hooks/exhaustive-deps`** is **enabled** (`warn`, CI treats warnings as errors via **`--max-warnings 0`**): **`fetchRequests`** / balance-tab fetchers use **`useCallback`**; **`MarketsList`** polling gate no longer references redundant **`markets.length >= 0`**.
- **ESLint 10:** Not upgraded yet — **`eslint-plugin-react-hooks`** (latest and canary) still declares peer **`eslint` ≤ 9**. Revisit when the plugin adds ESLint 10 to its peer range (avoid **`--legacy-peer-deps`** for this).
- **Cloudflare:** **`compatibility_date`** set to **2026-03-23** in root **`wrangler.toml`** and **`workers/auto-markets-cron/wrangler.toml`**.
- **Fixes while migrating:** **`Portfolio`** — `refreshUserBalance` lifted to **`useCallback`** so deposit/withdraw handlers call a defined function (was scoped only inside an effect). **`Navbar`** — removed unused **`setShowWalletModal`** prop. **`ErrorBoundary`** — dev details gated with **`import.meta.env.DEV`**. Misc. lint-driven cleanups (unused imports, escaped JSX text, empty `catch` bodies).

---

## Documentation consolidation (March 2026)

- Merged related docs: **ORACLE_PHASE2** → **ORACLE_STRATEGY.md** §6; **TAURI_UPDATER_SIGNING** → **RELEASE_DESKTOP.md**; **CRYPTO_DEPOSITS** → **PIPS_DEPOSIT_WITHDRAW_FLOW.md** §8–§9; **NEXT_STEPS_AND_PROD_READINESS** → **GET_APP_UP_AND_RUNNING.md** §11; **AUTO_MARKETS_TROUBLESHOOTING** + cron Worker readme → **AUTO_MARKETS.md**; **REDESIGN_SUMMARY** + **UX_UI_RECOMMENDATIONS** → **UX_HISTORY_AND_RECOMMENDATIONS.md**.
- Removed unused frontend utilities: `standardizedErrors.js`, `healthCheck.js`, `performance.js`, `retry.js`. Removed unused **vercel.json** (hosting is Cloudflare Pages).

### Second pass (dead code & SEO)

- Removed unrouted / unused components: **PitchDeck** (`/pitch`, `/investors`), **CreateMarket**, **Account**, **WalletConnect**; removed **formValidation.js** and **cache.js** (only used by deleted code).
- **SEO:** Dropped `/test` and `/test-active-contracts` entries; aligned meta copy with **crypto-only** deposits (no card) in `seo.js` and `frontend/index.html`. **lazyWithRetry** cache-bust list no longer references CreateMarket.

### Third pass (Activity route, deps, noise)

- **Activity page:** Replaced **ContractHistory** with **`Activity.jsx`** / **`Activity.css`**. Canonical route **`/activity`**; **`/history`** redirects with **`Navigate`**. Removed stale Canton **View in Explorer** link. Quieter **contractStorage** logs (no success spam).
- **Dependencies:** Removed unused **axios**, **@tanstack/react-query**, **zustand**, **date-fns** from `frontend/package.json`. **oracleService** now uses **`fetch`**. **`vite.config.js`** manual chunks no longer reference removed packages.
- **Footer:** Copy reflects **Pips on-platform** and **crypto** deposit/withdraw.

### Fourth pass (API hardening)

- **Ops secret:** When **`PRIVILEGED_API_SECRET`** and/or **`AUTO_MARKETS_CRON_SECRET`** is set on Pages, **`POST`** **`/api/add-credits`**, **`/api/update-user-balance`**, **`/api/store-contract`**, **`/api/create-position`**, and **`/api/resolve-markets`** require **`X-Privileged-Secret`** and/or **`X-Cron-Secret`** (or body fields). If **neither** env var is set, behavior is unchanged (open). **`update-market-status`** / **`update-contract-status`** stay callable from the app for admin/resolution UI.
- **Cron Worker** sends **`X-Privileged-Secret`** when **`PRIVILEGED_API_SECRET`** is set on the Worker. Documented in **`API.md`**, **`AUTO_MARKETS.md`**, **`wrangler.toml`**, **`.dev.vars.example`**.

---

## 1.0.22 — Docs, desktop tag (March 2026)

- **Docs refreshed** for production reality: **ARCHITECTURE.md** (Cloudflare, D1, Vectorize, P2P-first), **API.md** (Cloudflare Pages API first; Canton/DAML moved to historical appendix), **CLOUDFLARE.md** (Vectorize, Workers AI, markets cache + `sort=activity`), **GET_APP_UP_AND_RUNNING.md** (includes production Q&A), **AUTO_MARKETS.md** (cron Worker + troubleshooting; **SITE_URL** **dice.express**).
- **Desktop / Tauri:** version bump to **1.0.22** (`package.json`, `frontend/package.json`, `src-tauri/tauri.conf.json`, `Cargo.toml`, download fallback). Release tag **`v1.0.22`** triggers GitHub Actions desktop build.

---

## Remove Stripe integration (March 2025)

- **Stripe removed:** Card deposits and all Stripe references removed (Stripe rejected app due to crypto relevance). Deposits are now **crypto only**: Deposit from wallet (Web3) and Deposit with crypto (platform address).
- **API:** Removed `/api/stripe-webhook`, `/api/stripe-packages`, `/api/stripe-create-checkout-session` and related handlers.
- **Frontend:** Removed Stripe checkout UI from Portfolio, card option from Register wizard, `stripeProducts.js`, and Stripe copy from Documentation/SEO.
- **Docs:** Removed STRIPE.md, Stripe env from GET_APP_UP_AND_RUNNING, PIPS_DEPOSIT_WITHDRAW_FLOW, NEXT_STEPS, BRAND; deleted `frontend/public/stripe-products/` assets.
- **Config:** Removed Stripe vars from wrangler.toml and .dev.vars.example.

---

## Cleanup (January 2025)

- Removed 50+ redundant docs (query-endpoint variants, historical troubleshooting, handoff/setup duplicates).
- Removed temporary token files and unused API/oracle files.
- Consolidated docs: single QUERY_ENDPOINTS (now in API.md), oracle strategy in ORACLE_STRATEGY.md.
- **Current layout**: `functions/` (Pages API), `frontend/`, `schema/d1/`, `workers/`, `scripts/` (Cloudflare deploy scripts), `docs/`.

## Platform Improvements

- **Blockchain**: Dynamic multi-network architecture (BlockchainProvider, BlockchainRegistry, CantonProvider); ready for additional chains for deposit/withdraw.
- **Filtering**: Collapsible filters, debounced search, filter chips, clear-all, category and style filters.
- **UI**: Toast notifications, tooltips, standardized errors, theme variables, market card styling.
- **Virtual currency**: Platform Credits for all activity; multi-chain deposits/withdrawals (see **APPLICATION.md** / **PLATFORM_VISION_AND_ROADMAP.md**).
- **Prediction styles**: Yes/No, True/False, Happens/Doesn't, Multi-outcome; categories (Finance, Sports, etc.).
- **Font**: Comfortaa applied app-wide.

## Doc Consolidation (Latest)

- **AMM**: AMM_DVP_DESIGN, AMM_IMPLEMENTATION, AMM_AND_ALGORITHMS merged into [AMM.md](./AMM.md).
- **API**: Query-endpoints section merged into [API.md](./API.md).
- **Cloudflare**: Deploy, storage (D1/R2/KV), and production runbook: [DEPLOYMENT.md](./DEPLOYMENT.md). Brand and prediction markets: [BRAND.md](./BRAND.md), [PREDICTION_MARKETS.md](./PREDICTION_MARKETS.md). Crypto deposit verification: [PIPS_DEPOSIT_WITHDRAW_FLOW.md](./PIPS_DEPOSIT_WITHDRAW_FLOW.md) §8–§9.
