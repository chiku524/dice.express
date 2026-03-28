# Algorithms, P2P vs AMM, and platform financial risk

This doc answers: **what algorithms are involved**, **whether markets are peer-to-peer**, and **how to run with no platform funds at risk**.

---

## 1. Algorithms involved

### Market creation (automated events)

- **Event builders** — Turn external API data into prediction events with a stable ID, title, resolution criteria, and settlement time. No machine learning; rule-based (e.g. “next Friday” for stocks, “24h from now” for crypto).
- **Trend-based** — For stocks and crypto: use **current price × (1 + pct)** as the threshold and a fixed settlement time:
  - **stocks_trend:** “Will [symbol] close above $X by [this week’s Friday]?” with X = current price × 1.02.
  - **crypto_trend:** “Will [symbol] be above $X in 24h?” with X = current price × 1.02.
- **Resolution** — When a market is due, the backend calls the same API (Alpha Vantage, CoinGecko, The Odds API, etc.), compares the result to `oracleConfig` (e.g. threshold, endDate), and sets `resolvedOutcome` (Yes/No). No custom prediction model; outcome is determined by the external data.

### Trading (AMM)

- **Constant-product AMM** — `getQuote`: `outputAmount = (y * effectiveInput) / (x + effectiveInput)` with a fee (e.g. 0.3%) and max trade size (e.g. 10% of reserve). Users trade **against a liquidity pool**, not directly against each other.
- **Fees** — A share of the fee goes to the platform (`platformFeeShare`); the rest is left in the pool.

So: **algorithms** = rule-based event building + trend thresholds + oracle resolution + constant-product AMM. No user funds are used by “algorithms” in the sense of automated trading; algorithms only define markets and pricing.

---

## 2. Are all markets peer-to-peer?

**No.** Right now markets use an **AMM with platform-seeded liquidity**:

- Each new market gets a **liquidity pool** with **1000 Yes / 1000 No** (or another amount you configure). That liquidity is created by the **platform** when the market is created.
- Users trade **against the pool** via `POST /api/trade`. The **platform is the counterparty** (the pool pays out the other side).
- **Settlement:** **`settleVirtualMarketPositions`** credits **P2P** winners (`counterpartyPositionId` set) at **`2 × amount × (1 − fee)`** and **AMM / pool-only** winners at **`amount × (1 − fee)`** per share. **Void** refunds stakes. Credits are **idempotent** (`settlementCreditedAt` on each position). With **`DISABLE_AMM_TRADE=1`**, users do not open new AMM positions; existing AMM positions would still settle if any remain. Paying AMM winners credits **user balances** from the platform’s obligation to honor shares — pool **reserves** are not automatically debited in this path; treat AMM re-enable as inventory / risk management (see **P2P_AND_GROWTH_STRATEGY.md**).

So today:

- **AMM path:** User ↔ **pool (platform)**. Platform provides liquidity and would need to pay AMM winners if you add that payout path = **platform financial risk**.
- **P2P path:** User ↔ **another user** (matched orders). Only matched positions get paid at resolution; payouts come from the losing side = **no platform financial risk**.

Details and options (order book, intents, optional tiny seed) are in **docs/P2P_AND_GROWTH_STRATEGY.md**.

---

## 3. Running with no financial risk (no platform funds)

You said you **do not have funds to take financial risk** for users who deposit. To align with that:

### Do not act as liquidity provider (LP)

- **Do not** seed pools with platform capital. If you create pools with **zero initial liquidity**, users cannot trade via AMM until someone (e.g. users) adds liquidity. The platform then never has to pay out from its own pool.
- **Option:** Set **`AUTO_MARKETS_ZERO_LIQUIDITY=1`** (or **`INITIAL_POOL_LIQUIDITY=0`**). In this repo it is set in **`wrangler.toml`** under `[vars]` (so all new markets get 0/0 liquidity). If your project uses the Dashboard for vars instead, set it there; only **Secrets** must be set via Dashboard when vars are managed by wrangler. New automated markets (and any market created via the API) will get a pool with **0 Yes / 0 No**. `POST /api/trade` will then fail (no liquidity), so the only way to get positions is **P2P** (matched orders), where payouts are from the losing user to the winning user. No platform capital at risk.

### Keep deposits and payouts user-to-user

- User **deposits** (crypto) → credited as Pips to their account. You hold those balances; when they **withdraw**, you send money from the same pool of user funds (and fees). You are not “investing” that money; you are custodian.
- For **trading**, if you only allow P2P (no platform liquidity), then at resolution **winners are paid from losers’ stakes**; the platform only takes a fee. So you are not adding your own funds to pay winners.

### Summary

| Goal | What to do |
|------|------------|
| No platform capital at risk | Use **zero initial liquidity** for new markets (`AUTO_MARKETS_ZERO_LIQUIDITY=1`); do not seed pools with your own funds. |
| Payouts only from users | Use **P2P only** for trading (matched orders); resolution pays only positions with a counterparty (losing side pays winning side). |
| AMM later | When profits have accrued and you accept risk, set **`AUTO_MARKETS_ZERO_LIQUIDITY=0`** in `wrangler.toml` (or remove the var) and redeploy. New markets will then get 1000/1000 liquidity again. See **P2P_AND_GROWTH_STRATEGY.md**. |

---

## 4. References

- **P2P design and growth from zero:** **docs/P2P_AND_GROWTH_STRATEGY.md**
- **Automated market creation:** **docs/PREDICTION_MARKETS.md**
- **AMM logic:** `functions/lib/amm.mjs` (constant-product, fees, max trade size)
- **Resolution:** `functions/lib/resolve-markets.mjs` and `POST /api/resolve-markets`
