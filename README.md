# dice.express — Prediction Markets

A prediction markets platform where **all activity is virtual (Credits)**. Markets, positions, AMM, and balances are handled by **files and algorithms** (APIs + database); **no blockchain or Canton**.

## Features

- **Virtual-only**: Trade, create markets, AMM, and fees in platform **Credits**; no ledger/blockchain
- **Markets**: Created via API (user or automated from global events, industry topics, virtual realities)
- **AMM**: Automated market maker implemented in JS (`api/lib/amm.js`); constant product, fees, slippage and max trade size
- **Prediction styles**: Yes/No, True/False, Happens/Doesn't, Multi-outcome; categories (Finance, Sports, etc.)
- **Account**: Sign in with a virtual user ID; balance and positions stored in database

## Project Structure

```
.
├── api/                     # Serverless API (Vercel / proxy)
│   ├── lib/amm.js           # AMM algorithms (constant product, fees)
│   ├── markets.js           # GET/POST virtual markets
│   ├── pools.js             # GET pool by marketId
│   ├── trade.js             # POST AMM trade
│   ├── update-market-status.js
│   ├── create-position.js
│   ├── get-user-balance.js
│   ├── update-user-balance.js
│   ├── get-contracts.js
│   ├── store-contract.js
│   └── update-contract-status.js
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/         # marketsApi, balance (no ledger)
│   │   └── constants/
│   └── package.json
├── docs/                     # Documentation
└── package.json
```

## Prerequisites

- Node.js 18+ and npm
- **Backend**: Either **Supabase** (with Vercel/serverless API) **or** **Cloudflare D1 + KV + R2** for full data persistence on Cloudflare (see [docs/CLOUDFLARE_STORAGE_MIGRATION.md](docs/CLOUDFLARE_STORAGE_MIGRATION.md)).

## Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Environment

- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`) for the API.
- Frontend: optional `.env` for API base URL if not same origin.

### 3. Run

- **API**: Deploy to Vercel (or run locally with a server that serves `api/*`).
- **Frontend**: `cd frontend && npm run dev`.

## API (virtual)

- `GET /api/markets` — List markets (optional `?source=global_events|industry|virtual_realities|user`)
- `POST /api/markets` — Create virtual market (body: title, description, marketType, outcomes, resolutionCriteria, category, styleLabel, source, creator)
- `GET /api/pools?marketId=...` — Get AMM pool for a market
- `POST /api/trade` — Execute AMM trade (body: marketId, side, amount, minOut, userId)
- `POST /api/update-market-status` — Update market status (body: marketId, status, resolvedOutcome)
- `POST /api/create-position` — Create position (virtual)
- `GET/POST /api/get-user-balance` — Virtual balance
- `POST /api/update-user-balance` — Add/subtract balance
- `GET /api/get-contracts` — List stored contracts
- `POST /api/store-contract` — Store contract
- `PUT /api/update-contract-status` — Update contract status (e.g. Approved)

## Docs

- `docs/ARCHITECTURE.md` — High-level architecture (virtual-only)
- `docs/AMM.md` — AMM design and formulas
- `docs/PLATFORM_VISION_AND_ROADMAP.md` — Vision and roadmap
- `docs/CLOUDFLARE_STORAGE_MIGRATION.md` — **Data persistence on Cloudflare**: D1 (primary DB), KV (markets cache), R2 (contract backup)
