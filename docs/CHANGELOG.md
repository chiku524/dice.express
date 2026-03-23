# Changelog & Improvements

Summary of major cleanups and improvements. For current structure see [README](../README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

---

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
- **Virtual currency**: Platform Credits for all activity; multi-chain deposits/withdrawals (see VIRTUAL_CURRENCY_AND_MULTICHAIN.md).
- **Prediction styles**: Yes/No, True/False, Happens/Doesn't, Multi-outcome; categories (Finance, Sports, etc.).
- **Font**: Comfortaa applied app-wide.

## Doc Consolidation (Latest)

- **AMM**: AMM_DVP_DESIGN, AMM_IMPLEMENTATION, AMM_AND_ALGORITHMS merged into [AMM.md](./AMM.md).
- **API**: Query-endpoints section merged into [API.md](./API.md).
- **Cloudflare**: Deploy and storage (D1/R2/KV) merged into [CLOUDFLARE.md](./CLOUDFLARE.md). Brand and prediction markets: [BRAND.md](./BRAND.md), [PREDICTION_MARKETS.md](./PREDICTION_MARKETS.md). Crypto deposit verification: [PIPS_DEPOSIT_WITHDRAW_FLOW.md](./PIPS_DEPOSIT_WITHDRAW_FLOW.md) §8–§9.
