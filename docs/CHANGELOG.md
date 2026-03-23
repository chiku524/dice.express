# Changelog & Improvements

Summary of major cleanups and improvements. For current structure see [README](../README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1.0.22 — Docs, desktop tag (March 2026)

- **Docs refreshed** for production reality: **ARCHITECTURE.md** (Cloudflare, D1, Vectorize, P2P-first), **API.md** (Cloudflare Pages API first; Canton/DAML moved to historical appendix), **CLOUDFLARE.md** (Vectorize, Workers AI, markets cache + `sort=activity`), **GET_APP_UP_AND_RUNNING.md**, **NEXT_STEPS_AND_PROD_READINESS.md**, **AUTO_MARKETS_TROUBLESHOOTING.md** (cron + Odds quota, **SITE_URL** **dice.express**).
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
- **Cloudflare**: Deploy and storage (D1/R2/KV) merged into [CLOUDFLARE.md](./CLOUDFLARE.md). Brand, prediction markets, and crypto deposits consolidated into [BRAND.md](./BRAND.md), [PREDICTION_MARKETS.md](./PREDICTION_MARKETS.md), [CRYPTO_DEPOSITS.md](./CRYPTO_DEPOSITS.md).
