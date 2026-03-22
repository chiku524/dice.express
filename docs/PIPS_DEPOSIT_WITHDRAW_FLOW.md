# Pips: Deposit & Withdraw Flow

Pips is the platform currency. Users deposit (crypto or card) to receive Pips, trade with it, and withdraw earnings. A withdrawal fee applies.

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
- Deposit: "Deposit" → "Get Pips" (crypto or card).
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
| `DEPOSIT_VERIFICATION_RPC_URL` | Optional; when set, the API verifies each deposit tx on-chain before crediting (see **CRYPTO_DEPOSITS.md**). Use Alchemy/Infura free tier URL. |
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

## 5b. How we know a crypto deposit is real (transaction authenticity)

**In-API verification:** When you set `DEPOSIT_VERIFICATION_RPC_URL` (or `ALCHEMY_API_KEY`) and `PLATFORM_WALLET_ADDRESS`, the API **requires a txHash** and **verifies each deposit on-chain** before crediting:

- **Correct address:** The transaction must include an ERC20 `Transfer` to your **platform wallet** (no credit for transfers to other addresses).
- **Correct amount:** The on-chain Transfer amount must be **≥** the amount being credited (no over-crediting).
- **One-time use:** Each `txHash` can only be credited once. The API checks `deposit_records` by `reference_id` (txHash) and returns `alreadyCredited` without crediting again; a DB unique index on `reference_id` enforces this.

See **`CRYPTO_DEPOSITS.md`** for the full verification steps and recommended flow (automated watcher + Alchemy/Infura free tier).

- **Source of truth:** The **blockchain** is the public ledger. The API uses read-only RPC calls (e.g. `eth_getTransactionByHash`, `eth_getTransactionReceipt`) to confirm the transfer.
- **Who triggers crediting:** An **automated** pipeline (no manual verification): a watcher using the same RPC free tier watches your platform wallet for incoming USDC, then calls `POST /api/deposit-crypto` with `txHash`, `cryptoAmount`, `cryptoDecimals`, `userParty`. The API then verifies the tx and only credits if the chain confirms it.
- **Cost:** Alchemy or Infura free tiers are sufficient for light usage; no need for expensive custody APIs.

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
