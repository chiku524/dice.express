# Next Steps & Production Readiness

Quick reference for what’s done, what’s not, and what controls behavior.

**→ For a step-by-step launch checklist (deploy, D1, Stripe, crypto verification, watcher, withdrawals), see `GET_APP_UP_AND_RUNNING.md`.**

---

## 1. Deposit / Withdraw — Prod readiness

### Ready for prod (once configured)

| Feature | Ready? | What you must do |
|--------|--------|-------------------|
| **Stripe (card) deposit** | Yes | Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Cloudflare. In Stripe Dashboard → Webhooks, add `https://<your-domain>/api/stripe-webhook` and subscribe to `checkout.session.completed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`. |
| **Withdraw (crypto)** | Yes | Users can request withdrawals; balance is debited and a row is added to `withdrawal_requests`. You must run a separate process (cron, script, or admin) that (1) reads rows with `status = 'pending'`, (2) sends crypto from your platform wallet, (3) updates status (and optional `tx_hash`) in DB. |
| **Crypto deposit** | Yes | When your platform wallet receives funds, call `POST /api/deposit-crypto` (userParty, amount, networkId, txHash) to credit Pips. This can be manual (admin) or automated (indexer / webhook from custody provider). |

### Not implemented

- **Stripe payouts** (withdraw to user’s bank/card) — marked “Planned” in GUAP_DEPOSIT_WITHDRAW_FLOW.md.

### Summary

- **Card deposits:** Ready for prod once Stripe env + webhook are set.
- **Crypto deposits:** Ready once you have a way to detect incoming transfers and call the API (or do it manually).
- **Crypto withdrawals:** Ready for prod once you have a process that sends from your wallet and updates `withdrawal_requests`.

---

## 2. What dictates whether a prediction market is created?

**User-created markets are disabled.** Only API-driven (auto-markets) creation is allowed.

- **Creation:** Something must call `POST /api/auto-markets` with body `{ "action": "seed", "source": "sports" }` (or stocks, crypto, weather, weatherapi, news, perigon). No UI for creating markets; `/create` explains that markets are automated.
- **Scheduler:** There is no built-in cron. To create markets on a schedule, add an external cron or a Cloudflare Worker with a Cron Trigger that calls `POST /api/auto-markets` with the desired `source` and `limit`.
- **Resolution:** Markets resolve when their underlying event has a verdict. Call `POST /api/resolve-markets` (from a cron or manually) to resolve all due markets: the handler fetches outcomes from the relevant APIs (Odds, Alpha Vantage, CoinGecko, weather, etc.) and settles winners (2% fee). See **§3** below.

---

## 3. Suggested next steps

1. **Stripe (card)**
   - Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Cloudflare (Pages env / secrets).
   - Configure the webhook URL in Stripe and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
   - Test a small card deposit and confirm Pips is credited after checkout.

2. **Crypto**
   - Publish the platform wallet address (and any memo/ID rules) so users know where to send.
   - Decide how deposits are credited: manual (admin calls `POST /api/deposit-crypto`) or automated (indexer / custody webhook).
   - Implement the withdrawal side: script or cron that reads `withdrawal_requests`, sends from the platform wallet, then updates status (and optionally `tx_hash`).

3. **Auto-markets**
   - **Option A — Manual:** Use the API (e.g. Postman or a small script) to call `POST /api/auto-markets` with `{ "action": "seed", "source": "sports" }` (or other sources) when you want new markets.
   - **Option B — Scheduled:** Add a Cloudflare Worker with a Cron Trigger (or an external cron) that calls `POST https://<your-domain>/api/auto-markets` with a body like `{ "action": "seed", "source": "sports", "limit": 10 }` on a schedule (e.g. daily).
   - **Option C — UI:** Add an admin or “Seed markets” section in the app that calls `POST /api/auto-markets` with a chosen source and limit.

4. **Resolution**
   - **Implemented:** `POST /api/resolve-markets` finds Active markets with `oracleSource` that are due (event time or end date passed), calls the right API per type (The Odds API for sports, Alpha Vantage for stocks, CoinGecko for crypto, OpenWeather/WeatherAPI for weather, etc.), and settles with `resolvedOutcome` (Yes/No for binary). Call this endpoint from a cron (e.g. every hour or daily) to auto-resolve.

5. **Stripe products (optional)**
   - Pips is **1:1 USD**. For fixed product options ($5, $10, $25, $50, $100), use **`frontend/public/stripe-products/`**: see `STRIPE_PRODUCTS.md` for Name, Description, Amount, and the generated product images. Create the five products in Stripe Dashboard and optionally wire “Quick add” buttons in the app to use their Price IDs.

6. **Safety / ops**
   - In production, consider gating or removing the test “Add Pips” flow (`POST /api/add-credits`) or restricting it by IP/role.
   - Optionally protect `POST /api/auto-markets` (e.g. admin-only or API key) so random users cannot create many markets.

---

## 4. Quick reference

| Question | Answer |
|----------|--------|
| Are deposit/withdraw ready for prod? | Card (Stripe): yes after webhook + env. Crypto deposit: yes once you have a way to call the API. Crypto withdraw: yes once you have a process that sends from your wallet and updates DB. |
| What creates a prediction market? | Only `POST /api/auto-markets` with `action: "seed"`. User creation is disabled. |
| How do I get new auto-markets regularly? | Add a cron (or Worker Cron Trigger) that calls `POST /api/auto-markets` with `source` and `limit`. |
| How are markets resolved? | Call `POST /api/resolve-markets` (cron or manual). It resolves all due markets from oracle APIs and settles P2P winners. |
| Pips vs USD? | 1:1. 1 PP = $1 USD. Stripe product copy and images: `frontend/public/stripe-products/`. |
