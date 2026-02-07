# Virtual Currency & Multi-Chain Design

## 1. Virtual Currency (Platform Credits)

### 1.1 Purpose

- **Single unit of account** for all platform activity: trading, fees, AMM liquidity, LP rewards, market creation deposits.
- **Not** a blockchain token by default; it’s a **ledger + DB** balance. Optionally one chain (e.g. Canton) can hold a “CC” or equivalent that **backs** or **maps to** platform credits for that chain’s deposit/withdraw rail.

### 1.2 Naming & Display

- **Suggested name**: **Credits** or **Platform Credits** (configurable constant).
- **Symbol**: e.g. `CR` or `PMT`.
- **Decimals**: e.g. `2` or `4` for display.
- **Invariant**: Every credit in the system is either in a user’s balance or “locked” (in positions, liquidity, pending withdrawals). Sum of balances + locked = total ever credited minus total ever burned.

### 1.3 Balance Model

- **Primary source of truth**: Backend DB table `user_balances` (party/user → balance).
- **Credits are created when**:
  - User **deposits** on a supported chain: platform receives funds (or lock) → credits **credited** to user.
- **Credits are destroyed when**:
  - User **withdraws**: platform **debits** user and sends funds on chosen chain.
  - (Optional) Fees that are “burned” (if product decision).
- **Credits are locked when**:
  - User opens positions (amount in position).
  - User adds AMM liquidity (amount in pool).
  - User has pending withdrawal (amount reserved until tx is sent).

### 1.4 API (Platform Side)

- **GET /api/balance** (or existing user balance endpoint): Returns **virtual balance** (in Credits) for the authenticated user/party.
- **POST /api/deposit**: Body includes `networkId`, `amount` (in chain currency), optional `txHash` for proof. Backend validates on-chain (or via indexer), then **credits** user’s virtual balance.
- **POST /api/withdraw**: Body includes `networkId`, `amount` (in Credits), `destinationAddress`. Backend **debits** virtual balance, queues payout on that chain, returns withdrawal request id.

### 1.5 Relation to Canton “CC”

- Today: Canton has a **CC** token (TokenBalance); deposit flow transfers CC to platform wallet and updates DB balance.
- **Unified model**: Treat **CC** as **one funding rail**. Depositing CC → credits added to virtual balance. Withdrawing to Canton → credits debited, CC sent to user. Other chains (EVM) work the same way: deposit native/stablecoin → credits; withdraw → send native/stablecoin.

---

## 2. Multi-Chain (Deposits & Withdrawals)

### 2.1 Supported Chains (Target)

| networkId   | Purpose              | Deposit flow              | Withdraw flow           |
|------------|-----------------------|---------------------------|--------------------------|
| `canton`   | CC token              | Transfer CC to platform   | Platform sends CC to user |
| `ethereum` | ETH / USDC etc.       | Send to deposit address   | Platform sends to address |
| `polygon`  | MATIC / USDC etc.     | Send to deposit address   | Platform sends to address |
| (future)   | Arbitrum, Base, etc.  | Same pattern              | Same pattern             |

### 2.2 Deposit Flow (Generic)

1. User selects **chain** (e.g. Polygon).
2. Frontend requests **deposit instructions**: e.g. “Send USDC (or native) to address X, min Y, include memo Z.”
3. User sends on-chain tx.
4. Backend (indexer or webhook) sees tx; validates amount and memo.
5. **Credit** user’s virtual balance (convert chain amount to Credits at a fixed rate or 1:1 if stablecoin).
6. Notify user (e.g. “Deposit confirmed, +N Credits”).

**Rate**: For stablecoins (USDC, USDT), 1 unit = 1 Credit is simple. For volatile assets, define a fixed conversion or use oracle at deposit time.

### 2.3 Withdraw Flow (Generic)

1. User enters **amount (Credits)** and **chain** and **destination address**.
2. Backend checks balance ≥ amount + fee (if any); **debit** virtual balance (and optionally lock until tx is sent).
3. Queue payout: for that chain, send funds from platform treasury/escrow to destination address.
4. Record tx hash; mark withdrawal complete; release lock if any.

### 2.4 Provider Interface (Code)

- **BlockchainProvider** (existing): Keep for ledger/contract operations (Canton).
- **DepositWithdrawProvider** (new abstract interface):
  - `getDepositInstructions(networkId)` → { address, asset, minAmount, memoFormat }
  - `validateDeposit(txHash, networkId, params)` → { amount, creditedParty }
  - `submitWithdrawal(networkId, amount, destinationAddress, party)` → { requestId } (async)
  - `getWithdrawalStatus(requestId)` → { status, txHash }

- Per-chain implementations:
  - **CantonDepositWithdraw**: Uses existing CC transfer; deposit = user transfers to platform; withdraw = platform transfers to user.
  - **EthereumDepositWithdraw** (or **EVMDepositWithdraw**): Deposit = watch for incoming tx to platform address; Withdraw = send from hot wallet or multisig.

### 2.5 Security & Limits

- **Deposit**: Verify tx on-chain (confirmations); use memo or mapping to tie tx to user/party.
- **Withdrawal**: KYC/limits as needed; rate limits; cold/hot wallet split for large sums.
- **Double-spend**: All balance updates (credit/debit) must be atomic and consistent with DB.

---

## 3. Configuration (Env / Config)

- **Virtual currency**: `PLATFORM_CURRENCY_NAME`, `PLATFORM_CURRENCY_SYMBOL`, `PLATFORM_CURRENCY_DECIMALS`.
- **Per chain**: e.g. `DEPOSIT_ADDRESS_ETHEREUM`, `DEPOSIT_ADDRESS_POLYGON`, `WITHDRAW_MIN`, `WITHDRAW_MAX`, `WITHDRAW_FEE`.
- **Canton**: Keep existing `PLATFORM_WALLET_PARTY_ID`, ledger URL, package ID.

---

## 4. Database / State

- **user_balances**: `party` (or user_id), `balance` (Credits, decimal), `updated_at`.
- **deposits**: `id`, `party`, `network_id`, `chain_tx_hash`, `chain_amount`, `credits_amount`, `status`, `created_at`.
- **withdrawals**: `id`, `party`, `network_id`, `credits_amount`, `destination_address`, `chain_tx_hash`, `status`, `created_at`, `completed_at`.

This keeps virtual currency and multi-chain flows clear and auditable.
