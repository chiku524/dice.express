# Architecture (Cloudflare + virtual markets)

dice.express is a **virtual** prediction markets platform: markets, balances, P2P orders, and (optional) AMM pools live in **Cloudflare D1**. Deposits and withdrawals use **on-chain verification** where configured; there is no user-facing Canton/DAML path in the production web app.

## Overview

- **Frontend**: React (web + Tauri desktop). Calls **`GET /api/markets`** (often with **`sort=activity`** for P2P depth), limit orders via **`/api/orders`**, optional AMM via **`/api/trade`** when pools have liquidity.
- **API**: Cloudflare **Pages Functions** (`functions/api/[[path]].js`). Bindings: **D1** (`DB`), **KV** (`KV`), **R2** (`R2`), **Workers AI** (`AI`), **Vectorize** (`VECTORIZE`). Config in **`wrangler.toml`**.
- **Markets**: Rows in **`contracts`** (`template_id`: `VirtualMarket`, `LiquidityPool`, `Position`, …). Balances in **`user_balances`**. P2P orders in **`p2p_orders`**.
- **Automated creation**: Only **`POST /api/auto-markets`** (cron Worker or manual). User-created markets via **`POST /api/markets`** with `source: 'user'` are **disabled**.
- **Dedupe**: Lexical keys + semantic (Jaccard) in **`market-dedupe.mjs`**; paraphrase near-duplicates via **embeddings** (**`@cf/baai/bge-base-en-v1.5`**) + **Vectorize** in **`market-embeddings.mjs`**. Vectors removed when markets settle; maintenance API can backfill or prune. See **`PREDICTION_MARKETS.md`**.
- **P2P-first ops**: **`AUTO_MARKETS_ZERO_LIQUIDITY=1`** (committed default) gives new markets **zero** AMM liquidity so matching is **limit-order / P2P** until you change that policy. See **`USER_FLOWS_TRADING_AND_RISK.md`** and **`P2P_AND_GROWTH_STRATEGY.md`**.

## Core flows

1. **Market creation (automated)**: Cron Worker **`dice-express-auto-markets-cron`** posts to **`https://dice.express/api/auto-markets`** with **`seed_all`** and the full **`AUTO_MARKET_SOURCES`** list every hour, then **`POST /api/resolve-markets`**. **`SITE_URL`** on the Worker should match production (custom domain).
2. **Listing**: **`GET /api/markets`** returns markets with **`openOrderCount`**; Discover uses activity sort for fresh P2P signal. KV caches default list (~60s); **`sort=activity`** bypasses cache.
3. **AMM**: **`functions/lib/amm.mjs`** — constant product, fees, max trade size. Pools may have **zero** reserves in P2P-only mode.
4. **P2P**: **`POST /api/orders`**, **`POST /api/create-position`**; settlement **`POST /api/resolve-markets`** or **`POST /api/update-market-status`** (2% fee on P2P settlement path).
5. **Resolution**: **`resolve-markets.mjs`** calls external oracles (Odds, FRED, weather, Finnhub, …) per market payload.

## Observability

Structured JSON logs for cron-friendly search: **`auto_markets.seed.complete`**, **`resolve_markets.complete`**, **`prediction_maintenance.*`** (`functions/lib/prediction-observability.mjs`).

## Cloudflare-only data plane

Primary persistence is **D1**. **R2** backs up contract JSON. **KV** caches light responses. **Vectorize** holds embedding index for dedupe; **Workers AI** runs the embedding model. No Supabase/Vercel requirement for the markets API when D1 is bound.
