# User Flow & Platform Risk Audit

This document answers: **Is the user flow flawless? Can users register, sign in, deposit crypto (receive virtual tokens), and bet on predictions? Which APIs are used? Is the AMM fully functional? How can the platform be risk-free?**

---

## 1. User Flow Summary

| Step | Status | Notes |
|------|--------|--------|
| **Register** | ✅ Implemented | `POST /api/register` (Cloudflare D1). Email, password, display name; creates user + UserAccount contract. |
| **Sign in** | ✅ Implemented | `POST /api/sign-in` (Cloudflare D1). Returns account for session restore. |
| **Add Credits** | ✅ Implemented | **Cloudflare**: `POST /api/add-credits` (virtual top-up; no blockchain). Users add Credits from the Portfolio page. |
| **View balance** | ✅ Implemented | `GET/POST /api/get-user-balance` with `userParty`. |
| **Bet on prediction** | ✅ Implemented | `POST /api/trade` (AMM) or `POST /api/create-position` (fixed price). Debits balance, updates pool, creates Position. |
| **Resolution payout** | ❌ Not implemented | `POST /api/update-market-status` only sets `status` and `resolvedOutcome` on the market. **No code credits winning positions** when a market settles. Winners are not paid. |

---

## 2. APIs in Use

### Cloudflare Functions (D1 + optional KV/R2)

- **Auth**: `POST /api/register`, `POST /api/sign-in`
- **Balance**: `GET/POST /api/get-user-balance` (`userParty`), `POST /api/update-user-balance` (add/subtract), `POST /api/add-credits` (virtual top-up)
- **Markets**: `GET /api/markets`, `POST /api/markets`
- **AMM**: `GET /api/pools?marketId=...`, `POST /api/trade` (marketId, side, amount, minOut, userId). Can be disabled for P2P-only via `DISABLE_AMM_TRADE` (see `docs/P2P_AND_GROWTH_STRATEGY.md`).
- **Positions**: `POST /api/create-position`, positions stored in `contracts` (template Position)
- **Resolution**: `POST /api/update-market-status` (marketId, status, resolvedOutcome) — **no payout step**

---

## 3. AMM: Is It Fully Functional?

**Trading: yes.**  
The AMM is implemented and used:

- **`functions/lib/amm.mjs`**: constant product, fees, max trade size.
- **Pool creation**: When a market is created, a `LiquidityPool` is created with `createPoolState(marketId, 1000, 1000)` (1000 YES, 1000 NO).
- **Trade flow**: `POST /api/trade` gets quote with `getQuote`, checks `isTradeWithinLimit`, debits user balance, `applyTrade` updates pool, position is stored.
- **Parameters**: `feeRate` 0.3%, `platformFeeShare` 20%, `maxTradeReserveFraction` 10% of smallest reserve (LP protection).

**Liquidity provision: not exposed via API.**  
`addLiquidity` and `removeLiquidity` exist in `api/lib/amm.js` but there are no HTTP endpoints for them in Cloudflare functions. So **only the platform can add liquidity** (at market creation); users cannot add/remove liquidity via the app.

---

## 4. Critical Gaps for a “Flawless” Flow

### 4.1 Balance and identity: use `accountId`, not display name

- **Current**: Balance and trade use `userParty` / `userId`. After sign-in, the frontend sets `wallet.party = displayName` and sends that to balance and trade APIs. So **balance and positions are keyed by display name**.
- **Risk**: Display names are not unique; two users could share the same balance. Changing display name would effectively create a new “party” and leave the old balance behind.
- **Fix**: Use **`accountId`** (unique per user) for all balance and position ownership. Frontend should send `accountId` (or a stable `userParty` = `accountId`) to `get-user-balance`, `trade`, and `create-position`; backend should key `user_balances` and position `owner` by `accountId`.

### 4.2 Add Credits (virtual)

- **Current**: `POST /api/add-credits` credits a user’s balance (by `userParty` or `accountId`). No blockchain. Use Portfolio → Add Credits in the UI.

### 4.3 Settlement and payouts

- **Current**: When a market is set to `Settled` with `resolvedOutcome`, **no payout logic runs**. Winning positions are never credited.
- **Fix**: On resolution (e.g. when `status` is set to `Settled` and `resolvedOutcome` is set), backend should:
  1. Find all positions for that market where `positionType` (or equivalent) matches `resolvedOutcome`.
  2. For each winning position, credit `owner` with `amount` (e.g. 1 Credit per share).
  3. Debit the pool (or the AMM reserves) by the same total so that value is conserved and the platform does not invent Credits.

---

## 5. Making the Platform Risk-Free

Today the **platform seeds every pool** (1000 YES, 1000 NO). So the platform is the **liquidity provider (LP)**. When users buy YES or NO, they trade against this pool. When the market resolves, **in a complete design** the pool would pay 1 Credit per winning share; that payout would come from the pool’s reserves, i.e. from the LP — in this case, the platform. So the platform can **lose money** if the winning side is the one it sold a lot of (e.g. heavy YES buying, then YES wins).

To make the platform **risk-free** (platform does not lose money on resolution):

1. **Platform only takes fees**  
   - Do not seed pools with platform capital (or phase it out).  
   - Have **user-provided liquidity only**: add `POST /api/add-liquidity` and `POST /api/remove-liquidity` (and optionally LP positions), and allow only non-platform parties to be LPs.  
   - Platform earns only from `platformFeeShare` (e.g. 20% of the trading fee). Then the platform never holds the risk of paying out winners; LPs do.

2. **Settlement must be consistent**  
   - Payouts to winners must be **debited from the pool** (and/or from losing-side positions), not created out of thin air. That way the system is solvent and the platform does not inject capital to pay winners.

3. **Keep existing safeguards**  
   - **Max trade size** (e.g. 10% of smallest reserve) and **slippage** (`minOut`) already protect LPs and limit extreme moves; keep them.

Summary: **AMM logic is fine; the risk-free goal is achieved by not being the LP (only taking fees) and by implementing settlement so that payouts come from the pool/LPs, not from the platform.**

---

## 6. Recommended Action Items

1. **Use `accountId` for balance and positions** in API and DB (and in frontend when calling balance/trade/create-position).
2. **Add Credits** is implemented; optional future: real crypto deposit/withdraw.
3. **Implement settlement**: on `update-market-status` to `Settled` + `resolvedOutcome`, credit winners and debit the pool (or the relevant reserves) so that payouts are consistent and the platform does not take residual risk.
4. **Make the platform risk-free**: Use **P2P-only** (no platform LP). Set `DISABLE_AMM_TRADE=1` to turn off AMM trading; implement order book / matching so only matched pairs create positions and payouts come from counterparties. See **`docs/P2P_AND_GROWTH_STRATEGY.md`** for the full brainstorm and growth-from-zero approach.
