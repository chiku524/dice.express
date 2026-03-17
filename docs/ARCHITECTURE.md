# Architecture (Virtual-Only)

The application is a **virtual-only** prediction markets platform: all events and actions (markets, positions, AMM, balances) are handled by **files and algorithms** (APIs + database). There is **no blockchain or Canton**.

## Overview

- **Frontend**: React; fetches markets from `GET /api/markets`, creates markets via `POST /api/markets`, trades via `POST /api/trade` or `POST /api/create-position`, balance from `GET /api/get-user-balance`.
- **API**: Cloudflare Pages Functions; D1 for storage (`contracts`, `user_balances`); optional KV (cache), R2 (backup). AMM logic in `functions/lib/amm.mjs` (constant product, fees, max trade size).
- **Data**: Markets and pools stored as rows in `contracts` (template_id: VirtualMarket, LiquidityPool, Position, etc.). Balances in `user_balances`.

## Core flows

1. **Markets**: Created with `POST /api/markets` (no approval). Listed with `GET /api/markets`. Optional filter by `source` (global_events, industry, virtual_realities, user).
2. **AMM**: Each market has an initial pool (created when market is created). `GET /api/pools?marketId=...` returns pool state. `POST /api/trade` executes a trade (updates pool reserves, user balance, creates position).
3. **Positions**: Created by `/api/create-position` (fixed price) or by `/api/trade` (AMM). Stored in `contracts` with template_id Position.
4. **Resolution**: `POST /api/update-market-status` with `marketId`, `status` (e.g. Resolving, Settled), optional `resolvedOutcome`.

## AMM (functions/lib/amm.mjs)

- Constant product formula; configurable fee and platform fee share; max trade size as fraction of reserve (LP protection).
- Functions: `getQuote`, `isTradeWithinLimit`, `applyTrade`, `addLiquidity`, `removeLiquidity`, `createPoolState`.

## Cloudflare-only

- No blockchain, no Canton, no DAML. User identifies with account ID / display name; balance and state are in D1 only. Add Credits via `POST /api/add-credits`. For P2P-only mode, set `DISABLE_AMM_TRADE=1` and see `docs/P2P_AND_GROWTH_STRATEGY.md`.
