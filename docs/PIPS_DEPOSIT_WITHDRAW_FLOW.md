# Pips: Deposit & Withdraw Flow

Pips is the platform currency. Users deposit **crypto** to receive Pips, trade with it, and withdraw earnings. A withdrawal fee applies.

---

## 1. User flow (target)

1. **Deposit** — User chooses crypto (wallet or platform address).
   - **Crypto**: User sends USDC/ETH/etc. to a platform address or from connected wallet; platform credits their Pips balance at a defined rate (e.g. 1 USDC = 1 Pips).
2. **Trade** — All activity on the platform uses Pips (AMM or P2P). No need to mention "virtual" in normal UX.
3. **Withdraw** — User requests withdrawal of Pips.
   - Platform debits balance and sends crypto to the user.
   - A **withdrawal fee** is applied (e.g. 2% or fixed minimum). Fee is documented at withdrawal time.

---

## 2. Implementation status

| Step | Status | Notes |
|------|--------|--------|
| Balance in Pips (D1) | Done | `user_balances` stores balance per party. |
| Add Pips (testing) | Done | `POST /api/add-credits` for top-up; UI: "Add Pips" in Portfolio. |
| Deposit (crypto) | Done | POST /api/deposit-crypto when platform wallet receives funds. Precise 2-decimal Pips; optional raw crypto amount + decimals for 1:1 conversion. |
| Withdraw (crypto) | Done | POST /api/withdraw-request; platform wallet sends (manual or automation). |
| Withdrawal fee | Done | WITHDRAWAL_FEE_RATE (0.02), WITHDRAWAL_FEE_MIN (1). |

---

## 3. Fee and rate (suggested)

- **Deposit**: No fee (or small fee to cover network).
- **Withdrawal fee**: e.g. 2% of amount, minimum 1 PP. Configurable via env (e.g. `WITHDRAWAL_FEE_RATE=0.02`, `WITHDRAWAL_FEE_MIN=1`).
- **Rate**: For stablecoins, 1 unit = 1 Pips. For volatile crypto, use a fixed rate or oracle at deposit time.

---

## 4. UX copy (no "virtual" emphasis)

- Balance: "Your balance (PP)" or "Pips balance".
- Deposit: "Deposit" → "Get Pips" (crypto).
- Withdraw: "Withdraw Pips" with clear text: "A withdrawal fee of X% applies."
- Add Pips (testing): "Add Pips" for internal/test top-up; in production this can be hidden or gated.

This keeps the flow clear: **deposit (crypto) → receive Pips → trade → withdraw earnings (withdrawal fee)**.

---

## 5. Environment variables (Cloudflare)

Set in Cloudflare Pages/Workers env or `wrangler.toml` (secrets via `wrangler secret put`):

| Variable | Purpose |
|----------|---------|
| `DEPOSIT_CRYPTO_SECRET` | **Recommended for production.** Secret required to call `POST /api/deposit-crypto` (header `X-Deposit-Crypto-Secret` or body `depositCryptoSecret`). Prevents unauthorized crediting. |
| `WITHDRAWAL_FEE_RATE` | Optional; default `0.02` (2%). |
| `WITHDRAWAL_FEE_MIN` | Optional; default `1` (min 1 PP). |
| `WITHDRAW_MAX_PP` | Optional; max Pips per single withdrawal (e.g. `10000`). |
| `WITHDRAW_MAX_PENDING` | Optional; max pending withdrawals per user (e.g. `5`). Returns 429 when exceeded. |
| `DEPOSIT_VERIFICATION_RPC_URL` | Optional; when set, the API verifies each deposit tx on-chain before crediting (see **§8** below). Use Alchemy/Infura free tier URL. |
| `PLATFORM_WALLET_ADDRESS` | Required for verification; your platform's deposit wallet (EVM). |
| `DEPOSIT_VERIFICATION_USDC_CONTRACT` | Optional; USDC contract address so only that token is accepted. |
| `DEPOSIT_VERIFICATION_MIN_CONFIRMATIONS` | Optional; default `1`. Minimum block confirmations before crediting. |

**Crypto:** Set `DEPOSIT_CRYPTO_SECRET` so only your indexer/backend can credit deposits. The platform wallet address(es) and send logic are operated separately (manual or cron that reads `withdrawal_requests` and sends from the wallet).

**Crypto deposit precision:** Balance and deposit/withdraw use integer-cents arithmetic (2 decimal places). No float rounding. You can call `POST /api/deposit-crypto` with:
- Header `X-Deposit-Crypto-Secret` (or body `depositCryptoSecret`) matching `DEPOSIT_CRYPTO_SECRET` when set.
- `userParty`, `amount` (Pips, e.g. `"10.50"`), and optional `txHash`, `networkId`; or
- `userParty`, `cryptoAmount` (raw smallest units), `cryptoDecimals`, and optional `txHash`, `networkId` — conversion to Pips is exact (e.g. 1 USDC = 1.00 PP).
- **Idempotency:** If `txHash` is provided and that reference was already credited, the API returns `200` with `alreadyCredited: true` and does not add balance again.

---

## 5b. How we know a crypto deposit is real (summary)

When you set `DEPOSIT_VERIFICATION_RPC_URL` (or `ALCHEMY_API_KEY`) and `PLATFORM_WALLET_ADDRESS`, the API **requires a `txHash`** and verifies the transfer on-chain (recipient, amount, success, optional token contract and confirmations) before crediting. Each `txHash` is credited at most once (`deposit_records` / unique `reference_id`). For the full verification table, watcher flow, env vars, and Cloudflare secrets, see **§8** and **§9** below.

---

## 5c. Security & transparency

- **Deposit (crypto):** Crediting is protected by `DEPOSIT_CRYPTO_SECRET`. Same `txHash` cannot be credited twice (idempotent; DB unique index on `reference_id`).
- **Withdraw:** Destination address must be a valid EVM address (`0x` + 40 hex). Optional caps: `WITHDRAW_MAX_PP`, `WITHDRAW_MAX_PENDING` to limit blast radius and abuse. **Production:** Protect `POST /api/withdraw-request` with session auth or wallet signature so only the account owner can debit their balance.
- **Recording:** Every crypto deposit is stored in `deposit_records` (party, amount, source, reference_id, created_at). Every withdrawal is stored in `withdrawal_requests` (party, amount, fee, net, destination, network_id, status, tx_hash). Use `GET /api/deposit-records?userParty=…` and `GET /api/withdrawal-requests?userParty=…` for transparency and audit.

---

## 6. Pips ↔ USD (1:1)

**Pips is 1:1 with USD.** 1 PP = $1 USD. Deposits and withdrawals use this rate.

---

## 7. Deposit with crypto — how it works

- **UI:** Portfolio Balance tab shows platform wallet address(es) and the user account ID for memo. Users send USDC to that address.
- **Crediting:** A backend process must call POST /api/deposit-crypto when the platform wallet receives funds (manual or automated watcher). API can verify tx on-chain when DEPOSIT_VERIFICATION_RPC_URL and PLATFORM_WALLET_ADDRESS are set.
- **Deposit from connected wallet:** Portfolio → "Deposit from wallet". **EVM:** connect a Web3 wallet, pick network (Ethereum, Polygon, Arbitrum, Base, etc.), send USDC or native gas token to `PLATFORM_WALLET_ADDRESS`, then `personal_sign` the `deposit:<party>:<txHash>` message; `POST /api/deposit-with-tx` with `networkId` matching the chain. **Solana:** connect Phantom, send SPL USDC to `PLATFORM_WALLET_SOL`, sign the same message format with ed25519; API expects `networkId: "solana"` and base64 `signature`. Backend verifies on-chain (EVM via Alchemy/RPC; Solana via `SOLANA_RPC_URL`) and credits the user.

---

## 8. Crypto deposits: on-chain verification (no manual steps)

We recommend **not** using manual verification. Use:

1. **An RPC provider free tier** (Alchemy or Infura) for:
   - **Automated watcher:** A small job that watches your platform wallet for incoming USDC (or other ERC20) transfers and calls `POST /api/deposit-crypto` with `txHash`, `cryptoAmount`, `cryptoDecimals`, `userParty`.
   - **In-API verification:** The platform verifies each deposit on-chain before crediting. You only need one RPC URL; the API uses it for this verification.

2. **No manual steps:** The watcher runs on a schedule (e.g. Cloudflare Worker cron, or a small Node script on a free-tier host). When it sees a confirmed transfer, it calls your API; the API verifies the tx via RPC and only credits if the chain confirms it.

3. **Cost:** Alchemy and Infura offer **free tiers** sufficient for light usage (dozens to hundreds of deposits per month).

### 8.1 Automated watcher (you run this)

A service you run (e.g. Worker cron or a small script):

- Uses **Alchemy or Infura** (free account) to watch your **platform wallet address** for incoming ERC20 `Transfer` events (e.g. USDC).
- When a new transfer is detected (to your wallet), it reads from the chain: `txHash`, amount (raw), token decimals, and (if you use memos or a mapping) the user/party to credit.
- It calls your API:  
  `POST /api/deposit-crypto`  
  Headers: `X-Deposit-Crypto-Secret: <DEPOSIT_CRYPTO_SECRET>`  
  Body: `{ "userParty": "<party>", "cryptoAmount": "<raw>", "cryptoDecimals": 6, "txHash": "0x...", "networkId": "ethereum" }`
- The API then performs **on-chain verification** and only credits if the tx is confirmed and matches.

Only this watcher (and no human) should have `DEPOSIT_CRYPTO_SECRET` and only it should call the API after seeing a confirmed on-chain transfer.

### 8.2 In-API verification (platform does this)

When verification is enabled (`DEPOSIT_VERIFICATION_RPC_URL` or `ALCHEMY_API_KEY` + `PLATFORM_WALLET_ADDRESS`), the API **requires** a `txHash` and **verifies the transaction on-chain** before crediting.

| Step | What is checked | Prevents |
|------|------------------|----------|
| 1. **txHash required** | Request must include `txHash` when verification is enabled; else 400 `VERIFICATION_REQUIRED`. | Crediting without an on-chain transaction. |
| 2. **Transaction exists and succeeded** | RPC: `eth_getTransactionByHash`, `eth_getTransactionReceipt`; `receipt.status === 0x1`. | Fake or failed transactions. |
| 3. **Correct recipient** | ERC20 `Transfer` **to** address must be **platform wallet** (`PLATFORM_WALLET_ADDRESS`). | Crediting for transfers to the wrong address. |
| 4. **Correct amount** | Transfer amount (raw) must be **≥** the amount we are crediting. | Over-crediting. |
| 5. **Optional: token contract** | If `DEPOSIT_VERIFICATION_USDC_CONTRACT` is set, Transfer must be from that contract. | Crediting the wrong token. |
| 6. **Optional: confirmations** | Block count ≥ `DEPOSIT_VERIFICATION_MIN_CONFIRMATIONS`. | Reorg / unconfirmed tx. |
| 7. **One-time use** | Before crediting, API checks if `reference_id` (txHash) already exists in `deposit_records`. If it does, returns 200 with `alreadyCredited: true` and does **not** credit again. Unique index on `reference_id` prevents duplicate inserts. | Using the same transaction for duplicate Pips. |

### 8.3 Environment variables (verification)

Set in Cloudflare (e.g. `wrangler secret put` or Pages env):

| Variable | Purpose |
|----------|---------|
| `DEPOSIT_VERIFICATION_RPC_URL` | JSON-RPC endpoint. When set, the API verifies each deposit tx before crediting. |
| `PLATFORM_WALLET_ADDRESS` | Platform’s deposit wallet (EVM address). Ensures Transfer is **to** this address. In `wrangler.toml` under `[vars]` — do not add in dashboard. |
| `PLATFORM_WALLET_SOL` | Solana deposit address (public). Used with `SOLANA_RPC_URL` for SPL verification. |
| `SOLANA_RPC_URL` | Solana JSON-RPC URL (secret recommended). Required to verify `networkId: "solana"` deposits. |
| `SOLANA_WALLET_PRIVATE_KEY` | **Secret.** Platform Solana keypair for **USDC (SPL) withdrawals** (bs58 or JSON byte array). When set with `PLATFORM_WALLET_SOL`, the send helper checks the pubkey matches. |
| `DEPOSIT_VERIFICATION_SOLANA_USDC_MINT` | (Optional) SPL mint to accept; defaults to mainnet USDC. |
| `DEPOSIT_VERIFICATION_USDC_CONTRACT` | (Optional) USDC contract address. If set, API ensures Transfer is from this contract. |
| `DEPOSIT_VERIFICATION_MIN_CONFIRMATIONS` | (Optional) Minimum block confirmations (default 1). |
| `DEPOSIT_CRYPTO_SECRET` | Shared secret; only your watcher/backend should have it. API rejects requests without it when set. |

### 8.4 Testing verification

1. **Env check:** In Cloudflare: **ALCHEMY_API_KEY** (secret), **DEPOSIT_CRYPTO_SECRET** (secret). **PLATFORM_WALLET_ADDRESS** in `wrangler.toml` (no dashboard entry).
2. **Trigger:** When `POST /api/deposit-crypto` is called with a valid `txHash` that sent USDC (or another ERC20) **to** your platform wallet, the API builds the RPC URL from `ALCHEMY_API_KEY` + `networkId`, fetches tx and receipt, confirms success and a `Transfer` to `PLATFORM_WALLET_ADDRESS` with amount ≥ requested. If that fails → 400 `VERIFICATION_FAILED`. If it passes → credit user and return success.
3. **Test (no real funds):** Use testnet (e.g. Sepolia) and send test USDC to your platform wallet, then call the API with that `txHash`, `cryptoAmount`, `cryptoDecimals`, `userParty`, `networkId`, and `X-Deposit-Crypto-Secret`. Or mainnet with a small amount and 1+ confirmation.
4. **If verification fails:** Check response body for `message` (e.g. "Transaction not found", "No Transfer to platform wallet found"). Ensure tx is confirmed, recipient is exactly `PLATFORM_WALLET_ADDRESS`, and `networkId` matches the chain.

---

## 9. Cloudflare secrets for crypto (multi-chain)

Non-secret values (platform wallet addresses) are in **`wrangler.toml`** under `[vars]`. **Secrets** must be set in the **Cloudflare Dashboard** (or via `wrangler secret put`). Do **not** commit API keys or secrets.

**Expected setup:**

- **PLATFORM_WALLET_ADDRESS** is **not** a secret — it is already in `wrangler.toml` as a var (your public EVM deposit address). Do **not** add it in the dashboard.
- **ALCHEMY_API_KEY** must be set as a **secret** in the dashboard (exact name, all caps).
- **DEPOSIT_CRYPTO_SECRET** must be set as a **secret** in the dashboard (used by your deposit watcher when calling the API).

### Where to set them

- **Cloudflare Dashboard:** Your project (Pages or Workers) → **Settings** → **Environment variables** → **Add variable** → choose **Encrypted** (secret) for sensitive values.
- **Or CLI:** From the project root:
  ```bash
  npx wrangler pages secret put ALCHEMY_API_KEY --project-name=dice-express
  npx wrangler pages secret put DEPOSIT_CRYPTO_SECRET --project-name=dice-express
  ```

### Secrets to add

| Secret name | Description | Example / format |
|-------------|-------------|-------------------|
| **ALCHEMY_API_KEY** | Your Alchemy API key (enables deposit verification for all Alchemy-supported EVM chains). | From [Alchemy Dashboard](https://dashboard.alchemy.com) → your app → API Key. |
| **DEPOSIT_CRYPTO_SECRET** | Shared secret used by your deposit indexer/backend when calling `POST /api/deposit-crypto`. Only requests with header `X-Deposit-Crypto-Secret` (or body `depositCryptoSecret`) matching this value can credit deposits. | Generate a long random string (e.g. 32+ chars). |

**Optional (encrypted):** `DEPOSIT_VERIFICATION_MIN_CONFIRMATIONS`, `DEPOSIT_VERIFICATION_USDC_CONTRACT`.

### How it's used

- **ALCHEMY_API_KEY:** The API builds the RPC URL per chain, e.g. `https://eth-mainnet.g.alchemy.com/v2/<ALCHEMY_API_KEY>`. Supported networks (via `networkId`): `ethereum`, `polygon`, `arbitrum`, `optimism`, `base`, `avalanche`, `fantom`, `cronos`, `bnb`/`bsc`. Same key for all; subdomain chosen from the request’s `networkId`.
- **PLATFORM_WALLET_ADDRESS:** In `wrangler.toml` (EVM deposit address). Used by deposit verification to ensure the on-chain Transfer is to this wallet.
- **DEPOSIT_CRYPTO_SECRET:** Checked on every `POST /api/deposit-crypto`; if the env is set and the request doesn’t send the same value, the API returns 401.

### Platform wallets (already in wrangler.toml)

- **EVM:** `PLATFORM_WALLET_ADDRESS` = your EVM deposit address.
- **Solana (SPL USDC):** `PLATFORM_WALLET_SOL` = recipient wallet. Set **`SOLANA_RPC_URL`** (Helius, QuickNode, Triton, or `https://api.mainnet-beta.solana.com`) as a **secret**. Optional **`DEPOSIT_VERIFICATION_SOLANA_USDC_MINT`** (defaults to mainnet Circle USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`). Watcher calls `POST /api/deposit-crypto` with `networkId: "solana"`, `txHash` = base58 **signature**, `cryptoAmount` / `cryptoDecimals: 6`, same verification rules as EVM (amount, idempotency). **`POST /api/deposit-with-tx`** also supports Solana: user sends SPL USDC to the platform wallet, then signs `deposit:<party>:<txSignature>` with Phantom; `signature` is **base64** ed25519 (see API handler). For **Solana USDC withdrawals**, set **`SOLANA_WALLET_PRIVATE_KEY`** (secret) matching `PLATFORM_WALLET_SOL`.

Do **not** put Alchemy API keys or `DEPOSIT_CRYPTO_SECRET` in `wrangler.toml`; use Dashboard (or `wrangler secret put`) only.
