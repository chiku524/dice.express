# Get the web application up and running

Checklist to deploy and operate dice.express in production. Do these after **crypto deposit verification** is confirmed (see **Verifying deposit** below).

---

## 1. Deploy to Cloudflare Pages

- **Deploy:** From repo root: `npm run pages:deploy` (builds frontend and deploys to project `dice-express`). Or connect Git to Cloudflare Pages for automatic deploys.
- **Attach D1, R2, KV, Vectorize, Workers AI (required for full API):** In **Cloudflare Dashboard** → **Pages** → **dice-express** → **Settings** → **Functions**:
  - **D1 database bindings:** Add binding, Variable name: `DB`, D1 database: select **dice-express-db** (create it first via Workers & Pages → D1 → Create database if needed; use the same `database_id` as in `wrangler.toml`).
  - **R2 bucket bindings:** Add binding, Variable name: `R2`, R2 bucket: select **dice-express-r2** (create via R2 → Create bucket if needed).
  - **KV namespace bindings:** Add binding, Variable name: `KV`, KV namespace: select your namespace (e.g. **DICE_KV**; create via Workers & Pages → KV if needed, use the same `id` as in `wrangler.toml`).
  - **Vectorize:** Binding **`VECTORIZE`**, index **dice-express-market-embeddings** (768 dimensions, cosine). Create the index with Wrangler if it does not exist (see **`CLOUDFLARE.md`**).
  - **Workers AI:** Binding **`AI`** (Workers AI catalog) for embeddings used with Vectorize.
- Without D1/R2/KV, core API breaks. Without AI/Vectorize, markets still seed but **embedding dedupe** is skipped (lexical + semantic dedupe still apply).

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

See **`PIPS_DEPOSIT_WITHDRAW_FLOW.md`** (§8–§9) for crypto verification and secrets.

---

## 4. Verifying crypto deposit (regulatory / RPC verification)

- Confirm **ALCHEMY_API_KEY** and **DEPOSIT_CRYPTO_SECRET** are set (secrets). **PLATFORM_WALLET_ADDRESS** is in `wrangler.toml` (no dashboard entry).
- When a real deposit hits your platform wallet (EVM USDC), your **deposit watcher** (see below) calls `POST /api/deposit-crypto` with `txHash`, `cryptoAmount`, `cryptoDecimals`, `userParty`, `networkId`, and header `X-Deposit-Crypto-Secret`. The API then:
  - Verifies the tx on-chain via Alchemy (transaction exists, succeeded, ERC20 Transfer to your wallet, amount ≥ credited).
  - If verification fails → `400` + `VERIFICATION_FAILED` (no credit).
  - If it passes → credits the user and records the deposit.
- **Quick test:** Send a small USDC amount to your platform wallet, then call the API with that tx hash and correct amount/decimals/party/secret; confirm balance and `GET /api/deposit-records` show the deposit. See **`PIPS_DEPOSIT_WITHDRAW_FLOW.md`** §8.

---

## 5. Crypto deposit watcher (automated, no manual verification)

- Run a small service that watches your **platform wallet** for incoming ERC20 (e.g. USDC) transfers (e.g. Alchemy `eth_getLogs` or Transfers API), then calls:
  - `POST /api/deposit-crypto`  
  - Header: `X-Deposit-Crypto-Secret: <DEPOSIT_CRYPTO_SECRET>`  
  - Body: `{ "userParty": "<from memo or mapping>", "cryptoAmount": "<raw>", "cryptoDecimals": 6, "txHash": "0x...", "networkId": "ethereum" }` (or polygon, arbitrum, etc.).
- The API will verify the tx on-chain before crediting. Options: Cloudflare Worker with cron, or a small Node script on a free-tier host. See **`PIPS_DEPOSIT_WITHDRAW_FLOW.md`** §8.

---

## 6. Crypto withdrawals (sending from your wallet)

- Users request withdrawals in the app; the API debits balance and inserts into `withdrawal_requests` (status `pending`).
- You need a process that: (1) reads `withdrawal_requests` where `status = 'pending'`, (2) sends the requested crypto from your platform wallet to the user’s address, (3) updates the row (e.g. `status = 'completed'`, `tx_hash = '0x...'`). Use `storage.updateWithdrawalStatus(db, requestId, 'completed', txHash)` or direct D1 SQL. This can be a cron job or a script; no built-in sender in the app.

---

## 8. Automated prediction markets (free-tier APIs)

**Only automated creation; users cannot create markets.** See **`PREDICTION_MARKETS.md`** for full detail.

- **No extra cost:** Market data comes from **free-tier** APIs (The Odds API, CoinGecko, Alpha Vantage, OpenWeather, WeatherAPI, GNews, etc.). Within their limits (e.g. 500 req/month for Odds, 25/day for Alpha Vantage), there is **no cost**.
- **Cron Worker (recommended):** A Worker runs on a schedule and calls your site’s **`POST /api/auto-markets`** then **`POST /api/resolve-markets`**.
  - Deploy: `cd workers/auto-markets-cron && npx wrangler deploy`
  - **SITE_URL** (committed default **`https://dice.express`**) must be the exact production base URL (no trailing slash). Override in the Worker dashboard if needed.
  - Leave **AUTO_MARKETS_SOURCE** unset for **`seed_all`** with **every** lane in **`AUTO_MARKET_SOURCES`** (including **sports**) on **each** run. Set **AUTO_MARKETS_SOURCE** only to debug a single source. **The Odds API** free tier (~500 req/month) is lower than hourly sports usage (~720/month); use a paid plan or a single-source Worker for testing.
  - If **AUTO_MARKETS_CRON_SECRET** is set on **Pages**, set the **same** value on the Worker so **`X-Cron-Secret`** is sent on seed requests.
  - Default schedule: **every hour** UTC (`workers/auto-markets-cron/wrangler.toml` → `crons`).
- **API keys (on the Pages project):** For **sports** set **THE_ODDS_API_KEY** (free 500 req/month). For stocks: **ALPHA_VANTAGE_API_KEY**. For crypto, CoinGecko can work without a key (rate limited). See **`AUTO_MARKETS.md`** and **`PREDICTION_MARKETS.md`**.
- **Manual seed:** You can also call `POST https://<your-site>/api/auto-markets` with body `{ "action": "seed", "source": "sports", "limit": 10 }` anytime (e.g. from Postman or a script).

## 9. Resolution

- **Resolving markets:** Call `POST /api/resolve-markets` (cron or manual) to resolve due markets and settle winners (2% fee). Run periodically (e.g. hourly or daily).
- **Custom news (`operator_manual`) markets:** After **`resolutionDeadline`**, the same endpoint can settle **Yes** / **No** from news heuristics or **`Void`** with stake refunds if still ambiguous. Optional Pages env **`OPERATOR_MANUAL_RESOLVE_BEFORE_DEADLINE`**. See **`OPERATOR_MANUAL_RESOLUTION.md`**.

---

## 10. Optional

- **Add Pips (test):** In production, consider gating or removing the test “Add Pips” flow (`POST /api/add-credits`) or restricting by IP/role.
- **WITHDRAW_MAX_PP / WITHDRAW_MAX_PENDING:** Set in Cloudflare vars to cap withdrawal size and number of pending requests per user.

---

## 11. Production readiness Q&A

Quick reference for what’s done, what’s not, and what controls behavior. For a step-by-step launch checklist, use sections §1–§10 above.

### 11.1 Deposit / withdraw — prod readiness

| Feature | Ready? | What you must do |
|--------|--------|-------------------|
| **Withdraw (crypto)** | Yes | Users can request withdrawals; balance is debited and a row is added to `withdrawal_requests`. Run a process that (1) reads rows with `status = 'pending'`, (2) sends crypto from your platform wallet, (3) updates status (and optional `tx_hash`) in DB. |
| **Crypto deposit** | Yes | When your platform wallet receives funds, call `POST /api/deposit-crypto` (userParty, amount, networkId, txHash) to credit Pips. Use a manual admin flow or an automated indexer / webhook. |

### 11.2 What creates prediction markets?

**User-created markets are disabled.** Only API-driven (auto-markets) creation is allowed.

- **Creation:** Call `POST /api/auto-markets` with **`{ "action": "seed_all", "sources": [...] }`** (or **`seed`** + **`source`**) using keys in **`AUTO_MARKET_SOURCES`** (`functions/lib/data-sources.mjs`). No UI for end-user creation; `/create` explains automation.
- **Scheduler:** **`workers/auto-markets-cron`** is a Cloudflare Worker with an hourly Cron Trigger; it posts **`seed_all`** to **`SITE_URL`** (default **`https://dice.express`**) then **`resolve-markets`**. Optional **`AUTO_MARKETS_CRON_SECRET`** on Pages + Worker protects seeding.
- **Resolution:** Markets resolve when their underlying event has a verdict (or, for **operator-manual** custom news markets, when the deadline passes and automation applies). Call `POST /api/resolve-markets` (from a cron or manually). See **`ORACLE_STRATEGY.md`**, **`AUTO_MARKETS.md`**, and **`OPERATOR_MANUAL_RESOLUTION.md`**.

### 11.3 Suggested next engineering steps

1. **Crypto** — Publish the platform wallet address; choose how deposits are credited (manual vs automated); implement the withdrawal side (send from platform wallet, update `withdrawal_requests`).
2. **Auto-markets** — Manual **`seed`**, scheduled Worker, or admin UI; see **`AUTO_MARKETS.md`**.
3. **Resolution** — Run **`POST /api/resolve-markets`** on a schedule.
4. **Safety / ops** — In production, gate or remove the test “Add Pips” flow (`POST /api/add-credits`) or restrict by IP/role; optionally protect `POST /api/auto-markets`.

### 11.4 Quick reference

| Question | Answer |
|----------|--------|
| Are deposit/withdraw ready for prod? | Crypto deposit: yes once you have a way to call the API. Crypto withdraw: yes once you have a process that sends from your wallet and updates DB. |
| What creates a prediction market? | `POST /api/auto-markets` (`seed` / `seed_all`). User `source: 'user'` is disabled. |
| How do I get new auto-markets regularly? | **dice-express-auto-markets-cron** Worker (hourly) or manual **`seed_all`**. |
| How are markets resolved? | Call `POST /api/resolve-markets` (cron or manual). It resolves due markets from oracle APIs and settles P2P winners. |
| Pips vs USD? | 1:1. 1 PP = $1 USD. |

---

## Order of operations (summary)

1. Deploy to Cloudflare Pages (`npm run pages:deploy`); **attach D1, R2, KV** in Dashboard → Pages → dice-express → Settings → Functions.
2. Run D1 migrations (see §2; include `0005_deposit_reference_unique.sql`).
3. Set secrets on the **Pages** project: **ALCHEMY_API_KEY**, **DEPOSIT_CRYPTO_SECRET**.
4. (When you have crypto) Verify crypto deposit and run a deposit watcher; run a withdrawal processor.
5. **Automated markets:** Deploy the cron Worker (`cd workers/auto-markets-cron && npx wrangler deploy`); confirm **SITE_URL** is production (**`https://dice.express`** or your domain). Add API keys on **Pages** for each lane you need. After a **D1 wipe** of markets, align **Vectorize** (recreate index or **`POST /api/prediction-maintenance`**). See **`PREDICTION_MARKETS.md`**.
6. Call **POST /api/resolve-markets** periodically (cron or manual) to resolve due markets.

For more detail on deposit/withdraw and on-chain verification, see **`PIPS_DEPOSIT_WITHDRAW_FLOW.md`**. Auto-markets deploy and troubleshooting: **`AUTO_MARKETS.md`**.
