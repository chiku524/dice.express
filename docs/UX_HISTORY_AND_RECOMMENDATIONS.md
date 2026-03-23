# UX history and recommendations

This document combines a **historical** summary of a large navigation / automated-markets redesign (originally tied to DAML ledger concepts) with **ongoing** UX and UI recommendations. The live product today is **Cloudflare + Pips**; treat the first part as background where it mentions Canton or DAML.

---

## Part 1 — Historical redesign summary (automated markets & AMM)

### 1. Automated market creation (no admin approval)

**DAML (historical):** `MarketFactory` and **`CreateMarketDirect`** in `contracts/PredictionMarkets.daml`:

- **Choice `CreateMarketDirect`**: Creates a `Market` contract **directly in Active state** with no approval step.
- Parameters included `source`: `"global_events"`, `"industry"`, `"virtual_realities"` (used for discovery/filtering).
- **Market** template had optional **`source : Optional Text`**.

**Frontend: Discover by source**

- **Routes**: `/`, `/discover/global-events`, `/discover/industry`, `/discover/virtual-realities`, `/discover/user`.
- **Constants**: `MARKET_SOURCES` and `getSourceLabel()` in `marketConfig.js`.
- **MarketsList** accepts optional `source` prop; when set, only markets with that `payload.source` (or `"user"` when missing) are shown.

**How to populate automated markets (historical note)**

- Backend / cron / API would hold a `MarketFactory` contract and call `CreateMarketDirect`. Today, markets are created via **`POST /api/auto-markets`** and D1 — see **`PREDICTION_MARKETS.md`** and **`AUTO_MARKETS.md`**.

### 2. AMM enhancements (revenue & LP protection) — DAML era

Changes described in **`contracts/AMM.daml`** (historical ledger path):

- **LiquidityPool**: `platformFeeShare`, `maxTradeReserveFraction`; **ExecuteTrade** capped trade size relative to reserves.
- **PoolFactory CreatePool**: Optional `platformFeeShare`, `maxTradeReserveFraction` with defaults.

Current AMM behavior for the Cloudflare stack is documented in **`AMM.md`** and **`ARCHITECTURE.md`**.

### 3. Navbar & footer revamp (historical)

- **“Markets”** → **“Discover”** with source-based discover routes.
- **“Tools”** → **“Resources”** (Documentation, Admin, etc.).
- Footer groups aligned with discover vs platform links.

### 4. Files touched (historical reference)

| Area | Files |
|------|--------|
| DAML | `contracts/PredictionMarkets.daml`, `contracts/AMM.daml` |
| Frontend | `App.jsx`, `MarketsList.jsx`, `marketConfig.js`, `Navbar.jsx`, `Footer.jsx` |

---

## Part 2 — UX & UI recommendations

Theme, color palette, and background animations are left as-is. These recommendations focus on **flows, clarity, consistency, and usability**.

### 2.1 Onboarding & first-time experience

**Reduce gate friction (sign-in)**

- **Option A (recommended):** Allow **browsing without signing in**. Show markets list, market detail (read-only), and docs. When the user taps “Trade”, “Create Market”, or “Portfolio”, prompt for account (inline or modal).
- **Option B:** Reframe copy: **“Get started”**, short line that trading uses **Pips** / account ID, optional **“Continue as guest”**.

**Copy:** Prefer **“Account”** over “Connect Wallet” where it implies a crypto wallet; keep balance visible.

### 2.2 Navigation & information architecture

- **Discover:** Consider a single **Markets** entry with source filters as tabs/pills on the page to shorten the nav.
- **Resources:** Consider renaming **Contract History** to **Activity** or **History** if it’s user activity, not smart contracts.
- **Balance:** Show balance when signed in; label clearly (**Pips** / **PP**).
- **Account ID in nav:** Truncate with ellipsis; tooltip with full ID and copy.

### 2.3 Markets list

- **Filters:** Consider default collapsed filters on mobile; clear **Clear all** vs chips mental model.
- **Sort:** **Ending soon** if settlement dates exist; else **Newest** / **Volume**.
- **Cards:** Clear primary CTA; title, status, volume, implied probability when available; short empty states.

### 2.4 Market detail & trading

- **AMM vs manual position:** Prefer an explicit **Trade** / **Buy Yes** / **Buy No** flow using pool quote and **`POST /api/trade`** where applicable; reduce reliance on manual price entry where it confuses users.
- **Layout:** Resolution criteria and current pool / probability above the fold.
- **Feedback:** Prefer **toasts** over **`alert()`** for errors and success (the app already has toast infrastructure).

### 2.5 Create market, portfolio, account modal

- **Create market:** Progress or sections; success state with **View market** link.
- **Portfolio:** Tabs for Balance, Positions, Activity; empty states with clear CTAs.
- **Account modal:** One line explaining persistence; **Switch account** wording if applicable.

### 2.6 Copy & messaging

- Prefer **market**, **position**, **account**, **Pips** over **ledger** / **contract** in user-facing copy where it implies blockchain internals.
- Docs/resources: one short **How it works** in plain language.

### 2.7 Accessibility & polish

- Visible focus, labels/`aria-label` on inputs, loading states on submit buttons, 44px tap targets on mobile, scrollable modals.

### 2.8 Error & empty states

- Consistent pattern: icon + title + description + CTA; **Try again** that refetches when possible.

### Quick wins (summary)

| Area | Change |
|------|--------|
| Gate | Browse without sign-in; prompt when trading/creating. |
| Copy | Account vs wallet language; clear Pips labeling. |
| Market detail | AMM trade flow with quote; pool probability; toasts. |
| Create market | Success + link to new market. |
| Portfolio | Tabs; empty states. |
| Feedback | Toasts; inline validation; loading on buttons. |

Implement in phases (copy + toasts first, then trade UI, then browse-without-sign-in) to improve clarity without a full visual redesign.
