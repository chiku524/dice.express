# Platform Vision & Roadmap: Automated Multi-Chain Prediction Market

## Executive Summary

Transform the application into an **automated prediction market platform** where users predict on real-world occurrences across **any topic and industry**, using a **single virtual platform currency** for all activity, with **multi-chain deposits and withdrawals**, and **top-tier AMM (Automated Market Maker) and algorithmic** capabilities.

---

## 1. Vision

### 1.1 What We're Building

- **Automated prediction market**: Users create and trade on outcome markets; resolution is driven by oracles, time, or admin where appropriate.
- **Topic-agnostic**: Markets can cover **finance**, **sports**, **politics**, **weather**, **entertainment**, **science**, **crypto**, **macro events**, and custom categories.
- **Multiple prediction styles**: Not just binary YES/NO—support **True/False**, **multi-outcome**, **binary (happens/doesn’t)**, **scalar/range**, and **conditional** styles.
- **Blockchain where it matters**: Use **multiple blockchain networks** primarily for **deposits and withdrawals** (bringing value in, cashing out). On-platform activity (trading, fees, rewards) uses **virtual currency only**.
- **Single virtual currency**: One in-app currency (e.g. **Platform Credits**, **PMT**, or **Credits**) for:
  - Trading and position sizing
  - Fees (market creation, position change, settlement)
  - AMM liquidity and LP rewards
  - Any future rewards or governance
- **Algorithms & AMM**: Robust **pricing**, **liquidity curves**, **slippage control**, and optional **algorithmic trading / market-making** features.

### 1.2 Design Principles

| Principle | Description |
|-----------|-------------|
| **Virtual-first** | All platform activity in virtual currency; blockchain = funding layer. |
| **Multi-chain funding** | Users choose which chain to deposit/withdraw on (Ethereum, Polygon, Canton, etc.). |
| **Style-flexible** | Market creators pick prediction style (binary, multi-outcome, scalar, etc.). |
| **Oracle-ready** | Resolution can be automated via oracles (financial, sports, weather, etc.) or manual. |
| **AMM-first** | Deep, professional AMM with clear formulas, fees, and LP incentives. |

---

## 2. Prediction Styles (Market Types)

### 2.1 Style Taxonomy

| Style | Description | Example | Resolution |
|-------|-------------|---------|------------|
| **Binary (Yes/No)** | Two outcomes; current implementation. | "Will BTC > $100k by Dec 31?" | Yes or No |
| **True/False** | Same as binary; semantic alias for knowledge/fact markets. | "Is statement X true?" | True or False |
| **Happens / Doesn’t** | Event occurs or it doesn’t. | "Will event E occur by date D?" | Happens / Doesn’t |
| **Multi-outcome** | N mutually exclusive outcomes; one winner. | "Who wins the election? A / B / C" | One of A, B, C |
| **Scalar / Range** | Numeric outcome in a range; payouts by band or linear. | "Temperature in NYC on date X?" | Value in [min, max] |
| **Conditional** | Market resolves only if condition holds; else refund. | "If X wins primary, will Y win general?" | Resolve only if X wins |

### 2.2 Implementation Mapping (Current → Target)

- **Current**: `MarketType = Binary | MultiOutcome` in DAML.
- **Target**:
  - Keep **Binary** and **MultiOutcome** as core.
  - Add **style** or **variant** (e.g. `BinaryStyle = YesNo | TrueFalse | HappensDoesnt`) for UX and filtering.
  - **Scalar** and **Conditional** can be Phase 2 (new templates or extensions).

See **PREDICTION_MARKETS.md** for detailed data models and UI behavior.

---

## 3. Virtual Currency & Multi-Chain

### 3.1 Virtual Currency (In-Platform)

- **Name**: e.g. **Credits**, **PMT**, or **Platform Credits** (TBD).
- **Role**:
  - **Only** unit of account for: positions, fees, AMM reserves (in virtual terms), LP shares, rewards.
  - No on-chain token for this; it’s ledger + DB state.
- **Source of credits**:
  - **Deposit**: User deposits from a supported blockchain → credits are minted (credited) to their platform balance.
  - **Withdrawal**: User requests withdrawal → credits are burned (debited); settlement happens on the chosen chain.
- **Invariant**: Total platform credits in circulation = sum of user balances + locked in markets/liquidity (accounting must be consistent).

### 3.2 Multi-Chain (Deposits & Withdrawals Only)

- **Chains**: Support several networks (e.g. **Canton**, **Ethereum**, **Polygon**, **Arbitrum**, **Base**). Each has:
  - **Deposit**: User sends native/stablecoin to a **platform deposit address** (or lock/mint flow); backend credits their **virtual balance**.
  - **Withdrawal**: User requests payout in virtual credits → platform sends funds on the **selected chain** (from treasury/escrow).
- **Design**:
  - **BlockchainRegistry** already allows multiple providers; extend with **deposit/withdrawal** interface per chain.
  - Per chain: config (RPC, contract addresses, min/max amounts, fees).
  - Backend: credit/debit virtual balance and record chain, tx hash, amount.
- **Canton**: Can remain special (e.g. CC token) for one of the deposit/withdraw options; others use EVM or other chains.

See **VIRTUAL_CURRENCY_AND_MULTICHAIN.md** for flows, APIs, and security.

---

## 4. Algorithms & AMM

### 4.1 AMM (Automated Market Maker)

- **Current**: Constant product `x * y = k`, fees, DVP-style settlement (CIP-0056), binary + multi-outcome.
- **Enhancements**:
  - **Stable pricing**: Option for **LMSR** or **log-market-scoring** for thin markets.
  - **Curved AMM**: Configurable curves (e.g. steeper for extreme odds) to reduce manipulation.
  - **Fee tiers**: Per-market or per-pool fee; possible LP fee share.
  - **Slippage & TWAP**: Min-out amount, deadline; optional TWAP-based execution for larger orders.
  - **Concentrated liquidity** (Phase 2): Ranges for better capital efficiency.

### 4.2 Algorithms (Platform-Side)

- **Pricing**:
  - Real-time implied odds from pool state.
  - Optional integration with oracle or external odds for “fair” reference.
- **Liquidity**:
  - Recommendations for initial liquidity (e.g. 50/50 YES/NO) and min depth.
  - Alerts when reserves are low.
- **Resolution**:
  - Oracle-driven resolution (RedStone, sports, weather, etc.) where applicable.
  - Automatic settlement when oracle + trigger conditions are met.
- **Optional (later)**:
  - Market-making bots (provide liquidity), arbitrage detection, risk limits.

See **AMM_AND_ALGORITHMS.md** for formulas and integration points.

---

## 5. High-Level Architecture (Target State)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React)                                    │
│  Markets (all styles) | Portfolio | Deposit/Withdraw (multi-chain) | AMM UI  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│  Platform API         │  │  Virtual Ledger       │  │  Oracle / Resolution  │
│  (Auth, Balances,     │  │  (DAML/Canton)        │  │  (RedStone, Sports,   │
│   Markets, AMM)       │  │  Markets, Positions,  │  │   Weather, Manual)     │
│                       │  │  Pools, Token (CC)    │  │                        │
└───────────┬───────────┘  └───────────┬───────────┘  └───────────┬───────────┘
            │                          │                          │
            ▼                          ▼                          ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│  Multi-Chain Layer    │  │  Canton Participant   │  │  External APIs         │
│  Deposit/Withdraw     │  │  (JSON API, Ledger)   │  │  (Prices, Events)      │
│  Ethereum, Polygon,  │  │  TokenBalance (CC),   │  │                        │
│  Canton, ...          │  │  PredictionMarkets,   │  │                        │
│                       │  │  AMM                  │  │                        │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
```

- **Virtual currency** is the only unit for trading/fees; balance is **DB + optional on-chain (e.g. Canton CC)** for one of the funding rails.
- **Multi-chain** sits beside Canton: user deposits on chain X → backend credits virtual balance; user withdraws to chain Y → backend debits and pays on Y.

---

## 6. Phased Roadmap

### Phase 1: Foundation (Virtual Currency & Clarity)

- [ ] **Naming & docs**: Decide virtual currency name; document it as the single unit for all platform activity.
- [ ] **Balance model**: Ensure one canonical “platform balance” (virtual) used everywhere (DB + any Canton CC mapping).
- [ ] **Prediction styles**: Document and expose **True/False** and **Happens/Doesn’t** as UX variants of Binary (same DAML template).
- [ ] **Categories/topics**: Add **category** and **industry** (or tags) to markets for discovery (schema + UI).

### Phase 2: Multi-Chain Deposits & Withdrawals

- [ ] **Deposit/Withdraw API**: Abstract interface (chain, amount, address, tx tracking).
- [ ] **Canton**: Keep current Canton deposit/withdraw (CC) as one option.
- [ ] **EVM chains**: Add at least one EVM chain (e.g. Polygon or Ethereum) with deposit address + withdrawal flow.
- [ ] **Registry**: Register EVM provider(s) in BlockchainRegistry; use for deposit/withdraw only.
- [ ] **UI**: Wallet/balance page with “Deposit” (choose chain) and “Withdraw” (choose chain + address).

### Phase 3: Prediction Styles & Categories

- [ ] **Multi-outcome**: Already in DAML; improve UI (outcome creation, resolution, display).
- [ ] **Style selector**: Create market → choose style (Yes/No, True/False, Happens/Doesn’t, Multi-outcome).
- [ ] **Categories**: Filter/browse by category (Finance, Sports, Politics, etc.); optional subcategories.
- [ ] **Oracle mapping**: Per category, recommend or require oracle type (see ORACLE_STRATEGY.md).

### Phase 4: AMM & Algorithm Upgrades

- [ ] **AMM**: Configurable fee, min liquidity, slippage; document formulas in code and docs.
- [ ] **LMSR option**: Implement or integrate LMSR for small/thin markets if desired.
- [ ] **Pricing API**: Endpoint or hook for “current odds” from AMM state.
- [ ] **Resolution automation**: Where oracle data exists, auto-trigger resolution path.

### Phase 5: Scale & Polish

- [ ] **Scalar / conditional markets**: Design and implement if needed.
- [ ] **Concentrated liquidity**: Research and roadmap.
- [ ] **Analytics**: Volume, open interest, top markets by category.
- [ ] **Compliance & limits**: Per-user or per-market limits; optional KYC hooks.

---

## 7. Re-Structuring Suggestions

### 7.1 Documentation

- **docs/PLATFORM_VISION_AND_ROADMAP.md** (this file): Vision, principles, roadmap.
- **docs/VIRTUAL_CURRENCY_AND_MULTICHAIN.md**: Virtual currency rules, multi-chain flows.
- **docs/PREDICTION_MARKETS.md**: All market styles, data model, automated creation, UI.
- **docs/AMM_AND_ALGORITHMS.md**: AMM formulas, fee model, algorithm hooks.
- Keep **ORACLE_STRATEGY.md**, **ARCHITECTURE.md**, **BLOCKCHAIN_INTEGRATION.md** and link from here.

### 7.2 Code / Repo

- **Frontend**:
  - `constants/currency.js` (or similar): Virtual currency name, decimals, display.
  - `services/balance/`: Virtual balance fetch, deposit/withdraw API client.
  - `services/blockchain/`: Keep BlockchainProvider, Registry; add `DepositWithdrawProvider` interface and per-chain implementations.
  - `components/Markets/`: By category; `CreateMarket` with style selector.
- **API**:
  - `api/deposit.js`, `api/withdraw.js`: Support `networkId` (chain); delegate to chain adapter; update virtual balance.
  - Optional: `api/balances.js` (virtual balance only).
- **DAML**:
  - PredictionMarkets: Add optional `category : Text`, `styleLabel : Text` to Market (or MarketCreationRequest) for discovery.
  - Token/AMM: No change required for “virtual” concept; keep CC as one funding rail.

### 7.3 Naming Conventions

- **Virtual currency**: Use one constant everywhere (e.g. `PLATFORM_CURRENCY = 'Credits'`).
- **Chains**: `networkId` = `'canton' | 'ethereum' | 'polygon' | ...`.
- **Market style**: `Binary | MultiOutcome` in DAML; in UI add `binaryStyle: 'yesNo' | 'trueFalse' | 'happensDoesnt'`.

---

## 8. Success Criteria (High Level)

- Users can **create and trade** prediction markets in **multiple styles** (binary, multi-outcome, with clear style labels).
- **All platform activity** is in **one virtual currency**; deposits/withdrawals are the only link to real chains.
- Users can **deposit** from and **withdraw** to **at least 2 networks** (e.g. Canton + one EVM).
- **AMM** is the primary trading mechanism, with clear fees and slippage handling.
- **Categories/topics** and **oracles** support multiple industries (finance, sports, politics, etc.) as in ORACLE_STRATEGY.md.

---

## 9. Next Steps (Immediate)

1. **Review and approve** this vision and roadmap (priorities, phasing).
2. **Decide virtual currency name** (e.g. Credits, PMT).
3. **Implement Phase 1**: Virtual currency docs and constants; add category/style to market creation (schema + UI).
4. **Design multi-chain API**: Request/response for deposit and withdraw with `networkId`; then implement Canton + one EVM chain.

Once you confirm direction and naming, the next concrete tasks can be: (a) add `category` and `styleLabel` to DAML and CreateMarket UI, (b) introduce virtual currency constants and balance service, and (c) draft the multi-chain deposit/withdraw API and adapter interface.
