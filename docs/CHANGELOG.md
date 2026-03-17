# Changelog & Improvements

Summary of major cleanups and improvements. For current structure see [README](../README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

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
- **Cloudflare**: Deploy and storage (D1/R2/KV) merged into [CLOUDFLARE.md](./CLOUDFLARE.md). Brand, Stripe, prediction markets, and crypto deposits consolidated into [BRAND.md](./BRAND.md), [STRIPE.md](./STRIPE.md), [PREDICTION_MARKETS.md](./PREDICTION_MARKETS.md), [CRYPTO_DEPOSITS.md](./CRYPTO_DEPOSITS.md).
