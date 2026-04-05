# User flows, trading model, and platform risk

This document combines **end-user flow**, **which APIs are used**, **AMM vs P2P behavior**, and **how to run without platform capital at risk**. For deployment controls, see **`DEPLOYMENT.md`**. For growth and order-book UX, see **`P2P_AND_GROWTH_STRATEGY.md`**.

---

## 1. User flow summary

| Step | Status | Notes |
|------|--------|--------|
| **Register** | Implemented | `POST /api/register` (D1). Email, password, display name; creates user + account contract row. |
| **Sign in** | Implemented | `POST /api/sign-in` (D1). |
| **Add Pips / credits** | Implemented | **`POST /api/add-credits`** (virtual top-up; no blockchain). Production: gate or restrict. |
| **View balance** | Implemented | `GET/POST /api/get-user-balance` with `userParty` / account id. |
| **Bet / trade** | Implemented | **`POST /api/trade`** (AMM) or **`POST /api/orders`** + matching (P2P), **`POST /api/create-position`**. |
| **Resolution payout** | Implemented | **`POST /api/resolve-markets`** settles oracle and **operator_manual** markets; **`Void`** / **`Refund`** refunds stakes. **`POST /api/update-market-status`** with **Settled** + **`resolvedOutcome`** uses the same settlement helper. See **`OPERATOR_MANUAL_RESOLUTION.md`**. |

---

## 2. APIs in use (Cloudflare / D1)

- **Auth:** `POST /api/register`, `POST /api/sign-in`
- **Balance:** `GET/POST /api/get-user-balance`, `POST /api/update-user-balance`, `POST /api/add-credits`
- **Markets:** `GET /api/markets`, `POST /api/markets` (**`source: 'user'`** rejected)
- **AMM:** `GET /api/pools?marketId=…`, `POST /api/trade` — can be disabled with **`DISABLE_AMM_TRADE`** (see **`P2P_AND_GROWTH_STRATEGY.md`**)
- **P2P:** `GET/POST /api/orders`
- **Resolution:** `POST /api/resolve-markets`, `POST /api/update-market-status`

---

## 3. AMM: is it fully functional?

**Trading: yes** when pools have liquidity and AMM is not disabled.

- **`functions/lib/amm.mjs`**: constant product, fees, max trade size.
- **Pool creation:** Markets get a **`LiquidityPool`**; initial reserves depend on **`AUTO_MARKETS_ZERO_LIQUIDITY`** / **`INITIAL_POOL_LIQUIDITY`** (committed default is **P2P-first / zero seed**).
- **Trade flow:** `POST /api/trade` uses `getQuote`, `isTradeWithinLimit`, debits balance, `applyTrade`, stores position.
- **Parameters (typical):** `feeRate` ~0.3%, `platformFeeShare` 20%, `maxTradeReserveFraction` 10% of smallest reserve.

**Liquidity provision:** `addLiquidity` / `removeLiquidity` exist in code paths but **there are no public HTTP LP endpoints** in the Cloudflare router — only implicit seeding at market creation (when non-zero).

---

## 4. Algorithms involved (platform-side)

- **Market creation (automated):** Rule-based event builders (sports, stocks, crypto trends, weather, news, …). No ML; stable IDs and oracle payloads from **`functions/lib/data-sources.mjs`**.
- **Resolution:** At due time, backend calls external APIs (Odds, FRED, weather, Finnhub, …) per **`oracleConfig`**; **`operator_manual`** uses news search + heuristics (**`operator-manual-resolve.mjs`**).
- **Trading (AMM):** Constant-product formula; users trade against the pool, not each other.

There is no proprietary “prediction algorithm”; outcomes come from **oracles and rules**.

---

## 5. Are all markets peer-to-peer?

**No.** Two paths coexist:

- **AMM:** Users trade against the **liquidity pool**. If the platform seeded reserves, the platform bears **inventory / payout risk** on the pool side at resolution (see settlement code paths in **`OPERATOR_MANUAL_RESOLUTION.md`**).
- **P2P:** Matched limit orders create linked positions; at resolution, winners are paid from the losing side’s stakes (plus platform fee), not from platform capital — **when only matched positions exist**.

**Settlement summary:** **`settleVirtualMarketPositions`** credits **P2P** winners (`counterpartyPositionId` set) at **`2 × amount × (1 − fee)`** and **AMM-only** winners at **`amount × (1 − fee)`** per share; **Void** refunds **`costPips`** or **`amount × price`**. With **`DISABLE_AMM_TRADE=1`**, new AMM trades stop; existing AMM positions may still exist until resolved.

---

## 6. Running with no platform financial risk

| Goal | What to do |
|------|------------|
| **No platform LP risk** | Keep **`AUTO_MARKETS_ZERO_LIQUIDITY=1`** (or **`INITIAL_POOL_LIQUIDITY=0`**) so new pools are empty; users trade via **matched orders** only. |
| **Payouts from users** | Prefer **P2P-only** exposure: matched orders only create offsetting risk between users. |
| **Re-enable AMM later** | When you accept inventory risk, clear **`DISABLE_AMM_TRADE`** and zero-liquidity flags per **`wrangler.toml`** / dashboard. |

User deposits are **custody**: you hold assets off-platform and mirror **Pips** in D1 — that is separate from **market-making risk**.

---

## 7. Critical gaps and recommended actions

### 7.1 Identity: prefer stable `accountId`

Balance and trades historically keyed by **`userParty`** / display name can collide if names are not unique. **Recommendation:** use **`accountId`** everywhere in API and frontend for balance, orders, and positions.

### 7.2 Virtual top-up in production

**`POST /api/add-credits`** is convenient for dev; in production, **gate by IP/role** or remove.

### 7.3 Settlement and solvency

Automated **`resolve-markets`** is required on a schedule. If you mix **AMM** and **P2P** on the same market, validate **pool accounting vs credits** with your finance/ops policy.

### 7.4 “Risk-free” platform (no house as LP)

Do **not** seed pools with platform capital; use **P2P matching**; take fees only. Deeper playbook: **`P2P_AND_GROWTH_STRATEGY.md`**.

---

## 8. Related documentation

- **`AMM.md`** — formulas and fee model
- **`P2P_AND_GROWTH_STRATEGY.md`** — matching, partial fills, cold start
- **`DEPLOYMENT.md`** — env vars and cron
- **`OPERATOR_MANUAL_RESOLUTION.md`** — automated news markets and settlement tables
