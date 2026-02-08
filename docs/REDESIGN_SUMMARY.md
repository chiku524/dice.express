# Re-Design Summary: Automated Markets & AMM

This document summarizes the re-structuring done to support **automated market creation** (global events, industry topics, virtual realities), **top-notch AMM** with revenue protection, and **revamped navbar/footer**.

---

## 1. Automated Market Creation (No Admin Approval)

### DAML: `MarketFactory` and `CreateMarketDirect`

- **New template** `MarketFactory` in `contracts/PredictionMarkets.daml`:
  - Holds `factoryOperator` (platform/oracle party) and `configCid` (MarketConfig).
  - **Choice `CreateMarketDirect`**: Creates a `Market` contract **directly in Active state** with no approval step.
  - Parameters: `marketId`, `title`, `description`, `marketType`, `outcomes`, `settlementTrigger`, `resolutionCriteria`, `category`, `styleLabel`, **`source`**.
  - `source` is one of: `"global_events"`, `"industry"`, `"virtual_realities"` (used for discovery/filtering).

- **Market template** now has optional **`source : Optional Text`**.
  - Set to `Some source` when created via `CreateMarketDirect`.
  - Set to `None` when created via `MarketCreationRequest` approval (user-created).

### Frontend: Discover by Source

- **Routes**: `/`, `/discover/global-events`, `/discover/industry`, `/discover/virtual-realities`, `/discover/user`.
- **Constants**: `MARKET_SOURCES` and `getSourceLabel()` in `marketConfig.js`.
- **MarketsList** accepts optional `source` prop; when set, only markets with that `payload.source` (or `"user"` when missing) are shown.
- **Filter**: On “All Markets” (`/`), a **Source** dropdown lets users filter by source; on discover routes the source is fixed and the page title reflects it.

### How to Populate Automated Markets

- **Backend / cron / API**: Have a service that:
  1. Fetches or subscribes to **global events**, **industry topics**, or **virtual reality** data.
  2. Holds a `MarketFactory` contract (or gets its ID from config).
  3. Calls `CreateMarketDirect` with the appropriate `source` and market details.
- User-created markets continue to use **MarketCreationRequest** → admin approval (or a separate auto-approval flow if you add one).

---

## 2. AMM Enhancements (Revenue & LP Protection)

### Changes in `contracts/AMM.daml`

- **LiquidityPool**:
  - **`platformFeeShare : Decimal`** (e.g. 0.2 = 20% of trading fee to platform, rest to LPs).
  - **`maxTradeReserveFraction : Decimal`** (e.g. 0.1 = max trade size 10% of smallest reserve).
  - In **ExecuteTrade**: after computing `outputAmount`, a check ensures `outputAmount <= minReserve * maxTradeReserveFraction`; otherwise the choice aborts. This limits large trades and protects LPs and platform from excessive slippage.

- **PoolFactory CreatePool**:
  - Optional args: **`platformFeeShare`**, **`maxTradeReserveFraction`**.
  - Defaults: 20% platform fee share, 10% max trade fraction.

### Effects

- **Users**: Slippage is still controlled by `minOutputAmount`; trade size is capped so the book isn’t drained.
- **Platform**: A fixed share of every trade fee goes to platform revenue.
- **LPs**: Max trade size and fee share reduce risk of large adverse moves.

---

## 3. Navbar & Footer Revamp

### Navbar

- **“Markets”** replaced by **“Discover”**:
  - All Markets, Global Events, Industry Topics, Virtual Realities, User-Created, Create Market, My Portfolio.
- **“Tools”** replaced by **“Resources”**:
  - Documentation, AMM & Fees (anchor to `/docs#amm`), Admin Dashboard, Contract History, Test Contracts.
- Divider between discover links and “Create Market” / “My Portfolio”.
- Styling: existing dropdown and divider styles in `Navbar.css`.

### Footer

- **Discover**: All Markets, Global Events, Industry Topics, Virtual Realities, User-Created, Create Market, Portfolio.
- **Platform**: Documentation, AMM & Fees, Admin Dashboard, Contract History.
- **About**: Existing description plus a short note that markets are created automatically from global events, industry topics, and virtual realities, with AMM-backed liquidity and protected fees.

---

## 4. Files Touched

| Area | Files |
|------|--------|
| DAML | `contracts/PredictionMarkets.daml` (MarketFactory, Market.source), `contracts/AMM.daml` (platformFeeShare, maxTradeReserveFraction, ExecuteTrade cap) |
| Frontend | `App.jsx` (discover routes), `MarketsList.jsx` (source prop, filter, chips, clear), `marketConfig.js` (MARKET_SOURCES, getSourceLabel), `Navbar.jsx`, `Navbar.css`, `Footer.jsx`, `Footer.css` |
| Docs | `ARCHITECTURE.md`, `AMM.md`, `REDESIGN_SUMMARY.md` (this file) |

---

## 5. Next Steps (Optional)

1. **Deploy MarketFactory**: Run a setup script that creates a `MarketFactory` contract with the desired `factoryOperator` and `configCid`; use this in your backend when creating automated markets.
2. **Backend automation**: Implement the service that calls `CreateMarketDirect` for global events, industry topics, and virtual realities (e.g. calendar APIs, news, or game/VR feeds).
3. **Storage for automated markets**: If you persist markets in a DB, store `source` and optionally `templateId = "Market"` for factory-created markets so the frontend can show them even before full ledger sync.
4. **AMM UI**: Add a dedicated “AMM & Fees” section in Documentation (or a page) that explains platform fee share, max trade size, and slippage.
