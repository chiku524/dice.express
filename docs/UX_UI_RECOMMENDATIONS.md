# UX & UI Recommendations (Post–Canton, Virtual-Only)

Theme, color palette, and background animations are left as-is. These recommendations focus on **flows, clarity, consistency, and usability** for a virtual-only prediction markets app.

---

## 1. Onboarding & First-Time Experience

### 1.1 Reduce gate friction (Sign-in)

**Current:** User must enter a User ID (or “Sign in”) before seeing any content. All routes redirect to `WalletConnect` when not connected.

**Recommendation:**

- **Option A (recommended):** Allow **browsing without signing in**. Show markets list, market detail (read-only), and docs. When the user taps “Trade”, “Create Market”, or “Portfolio”, prompt for User ID (inline or modal) and then continue. This matches “try before you commit” and reduces bounce.
- **Option B:** If you keep the gate, rename and reframe:
  - Use **“Get started”** or **“Enter your name to continue”** instead of “Sign in” / “Connect Wallet”.
  - Short line: “Pick a name to trade with virtual Credits. No signup required.”
  - Pre-fill or suggest “guest” and make “Continue as guest” one tap.

**Copy:** Replace “Connect Wallet” everywhere with “Account” or “Sign in” so it’s clear there’s no crypto wallet. In Navbar, “Wallet” → “Account” and keep balance visible.

---

## 2. Navigation & Information Architecture

### 2.1 Navbar

- **Discover dropdown:** Consider a single “Markets” item that goes to `/`, and move source filters (Global Events, Industry, etc.) into the markets page (tabs or pills) so the nav is shorter and the bar less crowded.
- **Resources:** Rename “Contract History” to “Activity” or “History” so it’s clear it’s user activity, not smart contracts.
- **Balance:** Always show balance when logged in; make it clearly “Credits” (e.g. “1,234 CC” with a small label/tooltip “Credits”).
- **User ID in nav:** Truncate with ellipsis is good; add a tooltip on hover with full ID and “Copy” for power users.

### 2.2 Footer

- Align link groups with navbar (Discover vs Resources/Platform). Add a short line that everything is **virtual Credits** and **no blockchain** so first-time visitors get it without opening docs.

### 2.3 Breadcrumbs

- On **Market detail** and **Portfolio**, add a simple breadcrumb (e.g. “Markets → [Market title]” or “Portfolio → Positions”) to make back-navigation and context obvious.

---

## 3. Markets List

### 3.1 Filters

- **Default state:** Consider collapsing the filters panel by default on mobile (or when many filters are present) and expanding on “Filters” click. You already have expand/collapse; defaulting to collapsed can reduce overwhelm.
- **“Clear all”:** You have both filter chips and a “Clear All Filters” button; ensure one clear mental model (e.g. chips for per-filter clear, one “Clear all” in the filter bar).
- **Sort:** Add “Ending soon” if you have settlement/resolution dates; otherwise “Newest” / “Volume” is enough.

### 3.2 Cards

- **Primary action:** Make the card itself (or a clear “View” / “Trade” button) the main CTA so “click to open market” is obvious.
- **Key info at a glance:** On each card show: title, status, total volume, and if possible a simple “Yes %” or implied probability (e.g. from pool or last price). Avoid long description on the card.
- **Empty state:** When there are no markets (or no results after filters), use a single empty state: illustration or icon + “No markets yet” / “No markets match your filters” + “Create one” or “Clear filters” CTA.

### 3.3 Loading & errors

- Keep skeleton grids; ensure they match card layout. For “Markets API unavailable”, suggest “Try again” and optionally “Check status” if you have a status page.

---

## 4. Market Detail & Trading

### 4.1 AMM vs “Create Position”

**Current:** Market detail uses “Create Position” with **manual price** (0–1) and amount, calling `/api/create-position`. The backend also has **AMM trading** (`/api/trade`: spend Credits, get Yes/No shares at AMM price).

**Recommendation:**

- **Prefer AMM for binary markets:** Add a **“Trade”** (or “Buy Yes” / “Buy No”) flow that:
  - Fetches pool (e.g. GET `/api/pools?marketId=…`).
  - User enters **amount in Credits** and chooses **Yes** or **No**.
  - Show **quote** (e.g. “You pay 100 CC, receive ~X Yes shares at current price”).
  - Confirm → POST `/api/trade` → show success and updated balance/shares.
- **Keep “Create Position”** only if you use it for a different use case (e.g. manual limit orders or multi-outcome); otherwise phase it out in favor of AMM so users don’t have to guess a price.

### 4.2 Market detail layout

- **Above the fold:** Title, status badge, short description, resolution criteria. Then **current probability / pool state** (Yes % / No % from pool reserves) so users see “market sentiment” at a glance.
- **Volumes:** Keep Total / Yes / No volume in a compact row or grid; not the main focus for traders.
- **Trading block:** One clear card: “Buy Yes” / “Buy No” (or single “Trade” with side selector), amount input, quote summary, then “Confirm” with fee note (e.g. “0.3% fee”).
- **Back:** Keep “← Back to Markets” or breadcrumb; ensure it’s visible on mobile.

### 4.3 Feedback

- Replace **`alert()`** for errors and success with **toasts** (you have `ToastContainer` and context). Use toasts for “Position created”, “Insufficient balance”, “Trade failed”, etc., so the page doesn’t block and messages are consistent.
- For validation (e.g. “Enter a valid amount”), show inline error under the field and optional toast on submit.

---

## 5. Create Market

- **Progress:** If the form is long, add a simple progress indicator (e.g. “Step 1 of 3” or sections: Basics → Outcomes → Resolution).
- **Defaults:** Pre-fill sensible defaults (e.g. Binary, Yes/No, Manual resolution) so minimal required fields are visible first.
- **Success:** After creation, show success message with **link to the new market** (“View market”) and optional “Create another”. Avoid redirecting straight to home without confirmation.
- **Errors:** Show field-level errors (you have `fieldErrors`); ensure they’re visible and associated with the right inputs (e.g. `aria-describedby`).

---

## 6. Portfolio

- **Tabs or sections:** Separate “Balance” (deposit/withdraw), “Positions”, and “Activity” so the page isn’t one long list.
- **Positions:** For each position show: market title (link to market), outcome (Yes/No), size, entry price, and if possible current value or P&amp;L (derived from current market price). “Contract” or “Contract ID” language can be de-emphasized for a virtual-only product.
- **Empty state:** “No positions yet. Browse markets and buy Yes or No to get started.”
- **Deposit/withdraw:** If these are virtual-only, label clearly as “Add Credits” / “Withdraw Credits” and keep any limits or rules visible (e.g. “For testing” or “Virtual only”).

---

## 7. Account / “Wallet” Modal

- **Title:** “Account” is clearer than “Wallet” for virtual IDs.
- **Copy:** “User ID” is fine; add one line: “Your activity and balance are stored under this ID. No password required.”
- **Disconnect:** Consider “Switch account” instead of only “Disconnect” so users know they can use another ID.
- **Persistence:** If you persist the last-used ID in `localStorage`, mention “You’re signed in as …” so returning users see it immediately.

---

## 8. Copy & Messaging

- **Global:** Avoid “contract”, “ledger”, “wallet” in user-facing copy where it implies blockchain. Prefer “market”, “position”, “account”, “Credits (CC)”.
- **Subtitle on home:** “Discover and trade on prediction markets. All activity in Credits; deposit and withdraw on your preferred chain” still references “chain”. For virtual-only, use e.g. “Trade with virtual Credits. No crypto required.”
- **Docs/Resources:** Keep “AMM & Fees” and “Documentation”; ensure one short “How it works” section explains virtual Credits and AMM in plain language.

---

## 9. Accessibility & Polish

- **Focus:** Ensure keyboard focus is visible on all interactive elements (buttons, links, inputs, dropdowns). Theme already has focus styles; verify modals and dropdowns don’t trap focus incorrectly.
- **Labels:** All form inputs should have visible or `aria-label`; filter dropdowns and “Filters” toggle already use labels.
- **Loading:** Buttons that trigger API calls should show loading state (e.g. “Creating…” / spinner) and be disabled during request to prevent double submit.
- **Mobile:** Test filters, navbar dropdowns, and trade form on small screens; ensure tap targets are at least 44px and that modals are scrollable when content is long.

---

## 10. Error & Empty States

- **Consistent pattern:** Use the same card/alert style for errors and empty states (icon + title + short description + CTA). Reuse for “Market not found”, “No markets”, “API unavailable”, “Insufficient balance”.
- **Retry:** For network/API errors, provide “Try again” that refetches; avoid “Refresh the page” as the only option where a simple refetch would work.

---

## Summary: Quick Wins

| Area | Change |
|------|--------|
| **Gate** | Allow browse without sign-in; prompt for ID only when trading/creating. |
| **Copy** | “Connect Wallet” → “Account” / “Sign in”; “Wallet” → “Account”; remove “chain” from taglines. |
| **Market detail** | Add AMM “Buy Yes” / “Buy No” flow with quote; show pool probability; replace `alert()` with toasts. |
| **Create Market** | Success state with “View market” link; optional step indicator. |
| **Portfolio** | Tabs (Balance / Positions / Activity); clearer empty state and position row (market link, outcome, size). |
| **Feedback** | Use toasts for success/error; inline validation; loading states on submit buttons. |
| **Nav** | Show balance as “X CC”; optional shorter nav (Markets + filters on page). |

Implementing these in phases (e.g. copy + toasts first, then AMM trade UI, then browse-without-sign-in) will improve clarity and perceived quality without changing the existing look and feel.
