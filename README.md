# dice.express — Prediction Markets

A prediction markets platform powered by **Pips**. Users deposit (crypto) to get Pips, trade on outcomes, and withdraw earnings (withdrawal fee applies). Markets, P2P orders, AMM, and balances run on **Cloudflare** (D1, KV, R2).

## Features

- **Pips**: Platform currency. Deposit → receive Pips → trade → withdraw (fee applies).
- **Markets**: Created via API; filter by source (global_events, industry, user, etc.).
- **P2P**: Place orders (buy/sell Yes or No); when two orders match, positions are created and settlement pays winners (2% fee). `GET /api/orders?marketId=`, `POST /api/orders`.
- **AMM**: Optional; in `functions/lib/amm.mjs`. Disable with `DISABLE_AMM_TRADE=1` for P2P-only.
- **Prediction styles**: Yes/No, True/False, Happens/Doesn't, Multi-outcome.
- **Account**: Sign in; balance and positions in D1.

## Project Structure

```
.
├── functions/                # Cloudflare Pages Functions (API)
│   ├── api/[[path]].js      # /api/* router (D1, KV, R2)
│   └── lib/                 # amm.mjs, cf-storage.mjs, auth.mjs
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── constants/
│   └── package.json
├── schema/d1/                # D1 migrations
├── docs/
└── package.json
```

## Prerequisites

- Node.js 18+ and npm
- **Backend**: **Cloudflare** only — D1 (SQL), KV (cache), R2 (backup). All API in `functions/`. No Vercel, Supabase, or Canton.

## Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Environment

- **Cloudflare**: Bind D1 in `wrangler.toml` and run migrations: `0000_initial.sql`, `0001_users.sql`, `0002_p2p_orders.sql` (for P2P). Optional: KV, R2.
- Frontend: optional `VITE_API_ORIGIN` if API is on a different origin.

### 3. Run

- **Full stack**: `npm run pages:dev` (builds frontend and runs wrangler pages dev with D1).
- **Frontend only**: `npm run start:frontend` (needs deployed API or `VITE_API_ORIGIN`).

## API

- **Auth**: `POST /api/register`, `POST /api/sign-in`
- **Balance**: `GET/POST /api/get-user-balance`, `POST /api/add-credits` (add Pips)
- **Markets**: `GET/POST /api/markets`, `GET /api/pools?marketId=...`, `POST /api/trade` (AMM)
- **P2P**: `GET /api/orders?marketId=` — list open orders; `POST /api/orders` — create order (or cancel with `cancel: true, orderId, owner`). Matching is automatic; settlement pays winners when market is set to Settled (2% fee).
- **Positions**: `POST /api/create-position`, `POST /api/update-market-status` (status, resolvedOutcome; settles P2P positions)
- **Other**: `GET /api/health`, `GET /api/oracle?symbol=`, get/store/update contracts

## Docs

- `docs/README.md` — Documentation index
- `docs/GET_APP_UP_AND_RUNNING.md` — Deploy and run in production (D1, crypto, cron)
- `docs/ARCHITECTURE.md` — Cloudflare stack
- `docs/CLOUDFLARE.md` — Deploy to Cloudflare Pages, D1/R2/KV storage
- `docs/PIPS_DEPOSIT_WITHDRAW_FLOW.md` — Deposit (crypto) → Pips → withdraw (fee)
- `docs/PREDICTION_MARKETS.md` — Prediction styles, free/cheap APIs, automated market creation
- `docs/P2P_AND_GROWTH_STRATEGY.md` — P2P-only mode and growth from zero
