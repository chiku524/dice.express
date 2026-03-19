# Get the web application up and running

Checklist to deploy and operate dice.express in production. Do these after **crypto deposit verification** is confirmed (see **Verifying deposit** below).

---

## 1. Deploy to Cloudflare Pages

- **Deploy:** From repo root: `npm run pages:deploy` (builds frontend and deploys to project `dice-express`). Or connect Git to Cloudflare Pages for automatic deploys.
- **Attach D1, R2, KV (required for API):** In **Cloudflare Dashboard** → **Pages** → **dice-express** → **Settings** → **Functions**:
  - **D1 database bindings:** Add binding, Variable name: `DB`, D1 database: select **dice-express-db** (create it first via Workers & Pages → D1 → Create database if needed; use the same `database_id` as in `wrangler.toml`).
  - **R2 bucket bindings:** Add binding, Variable name: `R2`, R2 bucket: select **dice-express-r2** (create via R2 → Create bucket if needed).
  - **KV namespace bindings:** Add binding, Variable name: `KV`, KV namespace: select your namespace (e.g. **DICE_KV**; create via Workers & Pages → KV if needed, use the same `id` as in `wrangler.toml`).
- Without these bindings, the API (markets, balance, deposit, etc.) will not work.

---

## 2. Database (D1)

- Create D1 DB if needed: `npx wrangler d1 create dice-express-db` and set `database_id` in `wrangler.toml`.
- Run migrations in order (remote):
  ```bash
  npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0000_initial.sql
  npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0001_users.sql
  npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0002_p2p_orders.sql
  npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0003_deposits_withdrawals.sql
  npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0004_p2p_partial_fill.sql   # optional; skip if column already exists
  npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0005_deposit_reference_unique.sql
  ```
- Ensure the D1 database **dice-express-db** is attached to the Pages project (see §1).

---

## 3. Environment variables and secrets

**In Cloudflare Dashboard → your project → Settings → Environment variables:**

- **Vars (non-secret):** Usually inherited from `wrangler.toml`. To avoid platform financial risk, set **`AUTO_MARKETS_ZERO_LIQUIDITY=1`** (or **`INITIAL_POOL_LIQUIDITY=0`**) so new markets get zero liquidity; trading then requires P2P matched orders only. See **docs/ALGORITHMS_AND_RISK.md**. (e.g. `PLATFORM_WALLET_ADDRESS`, `PLATFORM_WALLET_SOL`). No need to re-add `PLATFORM_WALLET_ADDRESS` — it’s in `wrangler.toml`.
- **Secrets (encrypted):**
  - **ALCHEMY_API_KEY** — for deposit verification (RPC). Use the exact name (all caps).
  - **DEPOSIT_CRYPTO_SECRET** — used by your deposit watcher when calling `POST /api/deposit-crypto`.

See **`CRYPTO_DEPOSITS.md`** for crypto-specific secrets.

---

## 4. Verifying crypto deposit (regulatory / RPC verification)

- Confirm **ALCHEMY_API_KEY** and **DEPOSIT_CRYPTO_SECRET** are set (secrets). **PLATFORM_WALLET_ADDRESS** is in `wrangler.toml` (no dashboard entry).
- When a real deposit hits your platform wallet (EVM USDC), your **deposit watcher** (see below) calls `POST /api/deposit-crypto` with `txHash`, `cryptoAmount`, `cryptoDecimals`, `userParty`, `networkId`, and header `X-Deposit-Crypto-Secret`. The API then:
  - Verifies the tx on-chain via Alchemy (transaction exists, succeeded, ERC20 Transfer to your wallet, amount ≥ credited).
  - If verification fails → `400` + `VERIFICATION_FAILED` (no credit).
  - If it passes → credits the user and records the deposit.
- **Quick test:** Send a small USDC amount to your platform wallet, then call the API with that tx hash and correct amount/decimals/party/secret; confirm balance and `GET /api/deposit-records` show the deposit. See **`CRYPTO_DEPOSITS.md`** for details.

---

## 5. Crypto deposit watcher (automated, no manual verification)

- Run a small service that watches your **platform wallet** for incoming ERC20 (e.g. USDC) transfers (e.g. Alchemy `eth_getLogs` or Transfers API), then calls:
  - `POST /api/deposit-crypto`  
  - Header: `X-Deposit-Crypto-Secret: <DEPOSIT_CRYPTO_SECRET>`  
  - Body: `{ "userParty": "<from memo or mapping>", "cryptoAmount": "<raw>", "cryptoDecimals": 6, "txHash": "0x...", "networkId": "ethereum" }` (or polygon, arbitrum, etc.).
- The API will verify the tx on-chain before crediting. Options: Cloudflare Worker with cron, or a small Node script on a free-tier host. See **`CRYPTO_DEPOSITS.md`**.

---

## 6. Crypto withdrawals (sending from your wallet)

- Users request withdrawals in the app; the API debits balance and inserts into `withdrawal_requests` (status `pending`).
- You need a process that: (1) reads `withdrawal_requests` where `status = 'pending'`, (2) sends the requested crypto from your platform wallet to the user’s address, (3) updates the row (e.g. `status = 'completed'`, `tx_hash = '0x...'`). Use `storage.updateWithdrawalStatus(db, requestId, 'completed', txHash)` or direct D1 SQL. This can be a cron job or a script; no built-in sender in the app.

---

## 8. Automated prediction markets (free-tier APIs)

**Only automated creation; users cannot create markets.** See **`PREDICTION_MARKETS.md`** for full detail.

- **No extra cost:** Market data comes from **free-tier** APIs (The Odds API, CoinGecko, Alpha Vantage, OpenWeather, WeatherAPI, GNews, etc.). Within their limits (e.g. 500 req/month for Odds, 25/day for Alpha Vantage), there is **no cost**.
- **Cron Worker (recommended):** A Worker runs on a schedule and calls your site’s `POST /api/auto-markets` to seed markets.
  - Deploy the cron Worker: `cd workers/auto-markets-cron && npx wrangler deploy`
  - In Cloudflare Dashboard → Workers & Pages → **dice-express-auto-markets-cron** → Settings → Variables: set **SITE_URL** to your site (e.g. `https://dice-express.pages.dev` or your custom domain).
  - Optional: **AUTO_MARKETS_SOURCE** = `sports` (default), `crypto`, `stocks`, `weather`, etc.; **AUTO_MARKETS_LIMIT** = `10`.
  - Default schedule: daily at 08:00 UTC. Edit `workers/auto-markets-cron/wrangler.toml` → `crons` to change.
- **API keys (on the Pages project):** For **sports** set **THE_ODDS_API_KEY** (free 500 req/month). For stocks: **ALPHA_VANTAGE_API_KEY**. For crypto, CoinGecko can work without a key (rate limited). See `workers/auto-markets-cron/README.md` and `docs/PREDICTION_MARKETS.md`.
- **Manual seed:** You can also call `POST https://<your-site>/api/auto-markets` with body `{ "action": "seed", "source": "sports", "limit": 10 }` anytime (e.g. from Postman or a script).

## 9. Resolution

- **Resolving markets:** Call `POST /api/resolve-markets` (cron or manual) to resolve due markets and settle winners (2% fee). Run periodically (e.g. hourly or daily).

---

## 10. Optional

- **Add Pips (test):** In production, consider gating or removing the test “Add Pips” flow (`POST /api/add-credits`) or restricting by IP/role.
- **WITHDRAW_MAX_PP / WITHDRAW_MAX_PENDING:** Set in Cloudflare vars to cap withdrawal size and number of pending requests per user.

---

## Order of operations (summary)

1. Deploy to Cloudflare Pages (`npm run pages:deploy`); **attach D1, R2, KV** in Dashboard → Pages → dice-express → Settings → Functions.
2. Run D1 migrations (see §2; include `0005_deposit_reference_unique.sql`).
3. Set secrets on the **Pages** project: **ALCHEMY_API_KEY**, **DEPOSIT_CRYPTO_SECRET**.
4. (When you have crypto) Verify crypto deposit and run a deposit watcher; run a withdrawal processor.
5. **Automated markets:** Deploy the cron Worker (`cd workers/auto-markets-cron && npx wrangler deploy`), set **SITE_URL** (and optional **THE_ODDS_API_KEY** on the Pages project for sports). Markets will seed on the cron schedule at no extra cost (free-tier APIs).
6. Call **POST /api/resolve-markets** periodically (cron or manual) to resolve due markets.

For more detail on deposit/withdraw and security, see **`PIPS_DEPOSIT_WITHDRAW_FLOW.md`**, **`CRYPTO_DEPOSITS.md`**, and **`NEXT_STEPS_AND_PROD_READINESS.md`**.
