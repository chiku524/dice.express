# Architecture (Virtual-Only)

The application is a **virtual-only** prediction markets platform: all events and actions (markets, positions, AMM, balances) are handled by **files and algorithms** (APIs + database). There is **no blockchain or Canton**.

## Overview

- **Frontend**: React; fetches markets from `GET /api/markets`, creates markets via `POST /api/markets`, trades via `POST /api/trade` or `POST /api/create-position`, balance from `GET /api/get-user-balance`.
- **API**: Serverless (e.g. Vercel); uses Supabase for storage (`contracts`, `user_balances`). AMM logic in `api/lib/amm.js` (constant product, fees, max trade size).
- **Data**: Markets and pools stored as rows in `contracts` (template_id: VirtualMarket, LiquidityPool, Position, etc.). Balances in `user_balances`.

## Core flows

1. **Markets**: Created with `POST /api/markets` (no approval). Listed with `GET /api/markets`. Optional filter by `source` (global_events, industry, virtual_realities, user).
2. **AMM**: Each market has an initial pool (created when market is created). `GET /api/pools?marketId=...` returns pool state. `POST /api/trade` executes a trade (updates pool reserves, user balance, creates position).
3. **Positions**: Created by `/api/create-position` (fixed price) or by `/api/trade` (AMM). Stored in `contracts` with template_id Position.
4. **Resolution**: `POST /api/update-market-status` with `marketId`, `status` (e.g. Resolving, Settled), optional `resolvedOutcome`.

## AMM (api/lib/amm.js)

- Constant product formula; configurable fee and platform fee share; max trade size as fraction of reserve (LP protection).
- Functions: `getQuote`, `isTradeWithinLimit`, `applyTrade`, `addLiquidity`, `removeLiquidity`, `createPoolState`.

## No Canton / no DAML

- All previous DAML contracts and Canton integration have been removed.
- No ledger, no tokens, no wallet connect to a chain. User identifies with a virtual user ID; balance and state are in the database only.
