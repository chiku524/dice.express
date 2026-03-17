# Crypto deposits: verification & Cloudflare secrets

Covers **on-chain verification** of crypto deposits (no manual steps), **automated watcher** flow, and **Cloudflare secrets** (ALCHEMY_API_KEY, DEPOSIT_CRYPTO_SECRET) for multi-chain deposits.

---

# Part 1 — Verification (no manual steps)

We recommend **not** using manual verification. Use:

1. **An RPC provider free tier** (Alchemy or Infura) for:
   - **Automated watcher:** A small job that watches your platform wallet for incoming USDC (or other ERC20) transfers and calls `POST /api/deposit-crypto` with `txHash`, `cryptoAmount`, `cryptoDecimals`, `userParty`.
   - **In-API verification:** The platform verifies each deposit on-chain before crediting. You only need one RPC URL; the API uses it for this verification.

2. **No manual steps:** The watcher runs on a schedule (e.g. Cloudflare Worker cron, or a small Node script on a free-tier host). When it sees a confirmed transfer, it calls your API; the API verifies the tx via RPC and only credits if the chain confirms it.

3. **Cost:** Alchemy and Infura offer **free tiers** sufficient for light usage (dozens to hundreds of deposits per month).

---

## How it works

### 1. Automated watcher (you run this)

A service you run (e.g. Worker cron or a small script):

- Uses **Alchemy or Infura** (free account) to watch your **platform wallet address** for incoming ERC20 `Transfer` events (e.g. USDC).
- When a new transfer is detected (to your wallet), it reads from the chain: `txHash`, amount (raw), token decimals, and (if you use memos or a mapping) the user/party to credit.
- It calls your API:  
  `POST /api/deposit-crypto`  
  Headers: `X-Deposit-Crypto-Secret: <DEPOSIT_CRYPTO_SECRET>`  
  Body: `{ "userParty": "<party>", "cryptoAmount": "<raw>", "cryptoDecimals": 6, "txHash": "0x...", "networkId": "ethereum" }`
- The API then performs **on-chain verification** and only credits if the tx is confirmed and matches.

Only this watcher (and no human) should have `DEPOSIT_CRYPTO_SECRET` and only it should call the API after seeing a confirmed on-chain transfer.

### 2. In-API verification (platform does this)

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

---

## Environment variables (verification)

Set in Cloudflare (e.g. `wrangler secret put` or Pages env):

| Variable | Purpose |
|----------|---------|
| `DEPOSIT_VERIFICATION_RPC_URL` | JSON-RPC endpoint. When set, the API verifies each deposit tx before crediting. |
| `PLATFORM_WALLET_ADDRESS` | Platform’s deposit wallet (EVM address). Ensures Transfer is **to** this address. In `wrangler.toml` under `[vars]` — do not add in dashboard. |
| `DEPOSIT_VERIFICATION_USDC_CONTRACT` | (Optional) USDC contract address. If set, API ensures Transfer is from this contract. |
| `DEPOSIT_VERIFICATION_MIN_CONFIRMATIONS` | (Optional) Minimum block confirmations (default 1). |
| `DEPOSIT_CRYPTO_SECRET` | Shared secret; only your watcher/backend should have it. API rejects requests without it when set. |

---

## Testing verification

1. **Env check:** In Cloudflare: **ALCHEMY_API_KEY** (secret), **DEPOSIT_CRYPTO_SECRET** (secret). **PLATFORM_WALLET_ADDRESS** in `wrangler.toml` (no dashboard entry needed).
2. **Trigger:** When `POST /api/deposit-crypto` is called with a valid `txHash` that sent USDC (or another ERC20) **to** your platform wallet, the API builds the RPC URL from `ALCHEMY_API_KEY` + `networkId`, fetches tx and receipt, confirms success and a `Transfer` to `PLATFORM_WALLET_ADDRESS` with amount ≥ requested. If that fails → 400 `VERIFICATION_FAILED`. If it passes → credit user and return success.
3. **Test (no real funds):** Use testnet (e.g. Sepolia) and send test USDC to your platform wallet, then call the API with that `txHash`, `cryptoAmount`, `cryptoDecimals`, `userParty`, `networkId`, and `X-Deposit-Crypto-Secret`. Or mainnet with a small amount and 1+ confirmation.
4. **If verification fails:** Check response body for `message` (e.g. "Transaction not found", "No Transfer to platform wallet found"). Ensure tx is confirmed, recipient is exactly `PLATFORM_WALLET_ADDRESS`, and `networkId` matches the chain.

For full flow (deposit + withdraw), see **GUAP_DEPOSIT_WITHDRAW_FLOW.md**.

---

# Part 2 — Cloudflare secrets for crypto (multi-chain)

Non-secret values (platform wallet addresses) are in **`wrangler.toml`** under `[vars]`. **Secrets** must be set in the **Cloudflare Dashboard** (or via `wrangler secret put`). Do **not** commit API keys or secrets.

**Expected setup:**

- **PLATFORM_WALLET_ADDRESS** is **not** a secret — it is already in `wrangler.toml` as a var (your public EVM deposit address). Do **not** add it in the dashboard.
- **ALCHEMY_API_KEY** must be set as a **secret** in the dashboard (exact name, all caps).
- **DEPOSIT_CRYPTO_SECRET** must be set as a **secret** in the dashboard (used by your deposit watcher when calling the API).

---

## Where to set them

- **Cloudflare Dashboard:** Your project (Pages or Workers) → **Settings** → **Environment variables** → **Add variable** → choose **Encrypted** (secret) for sensitive values.
- **Or CLI:** From the project root:
  ```bash
  npx wrangler pages secret put ALCHEMY_API_KEY --project-name=dice-express
  npx wrangler pages secret put DEPOSIT_CRYPTO_SECRET --project-name=dice-express
  ```

---

## Secrets to add

| Secret name | Description | Example / format |
|-------------|-------------|-------------------|
| **ALCHEMY_API_KEY** | Your Alchemy API key (enables deposit verification for all Alchemy-supported EVM chains). | From [Alchemy Dashboard](https://dashboard.alchemy.com) → your app → API Key. |
| **DEPOSIT_CRYPTO_SECRET** | Shared secret used by your deposit indexer/backend when calling `POST /api/deposit-crypto`. Only requests with header `X-Deposit-Crypto-Secret` (or body `depositCryptoSecret`) matching this value can credit deposits. | Generate a long random string (e.g. 32+ chars). |

**Optional (encrypted):** `DEPOSIT_VERIFICATION_MIN_CONFIRMATIONS`, `DEPOSIT_VERIFICATION_USDC_CONTRACT`.

---

## How it's used

- **ALCHEMY_API_KEY:** The API builds the RPC URL per chain, e.g. `https://eth-mainnet.g.alchemy.com/v2/<ALCHEMY_API_KEY>`. Supported networks (via `networkId`): `ethereum`, `polygon`, `arbitrum`, `optimism`, `base`, `avalanche`, `fantom`, `cronos`, `bnb`/`bsc`. Same key for all; subdomain chosen from the request’s `networkId`.
- **PLATFORM_WALLET_ADDRESS:** In `wrangler.toml` (EVM deposit address). Used by deposit verification to ensure the on-chain Transfer is to this wallet.
- **DEPOSIT_CRYPTO_SECRET:** Checked on every `POST /api/deposit-crypto`; if the env is set and the request doesn’t send the same value, the API returns 401.

---

## Platform wallets (already in wrangler.toml)

- **EVM:** `PLATFORM_WALLET_ADDRESS` = your EVM deposit address.
- **Solana:** `PLATFORM_WALLET_SOL` = your Solana address (on-chain verification is implemented for EVM only; Solana/BTC/LTC/DOGE can be used for display or future verification).

Do **not** put Alchemy API keys or `DEPOSIT_CRYPTO_SECRET` in `wrangler.toml`; use Dashboard (or `wrangler secret put`) only.
