# P2P Trading & Growth Strategy (from zero users)

This doc brainstorms how to run **peer-to-peer only** (no platform as LP) so the platform never pays out and only earns fees, and how to handle **no counterparty** when growing from zero users.

---

## 0. Who is the counterparty? (No platform risk)

**“Matching” here means matching two users’ orders — not the platform taking the other side.**

- When we **match** orders (e.g. $100 Yes vs $1 No → $1 fills), we are **pairing User A with User B**. User A’s stake is matched by **User B’s stake**. The platform does **not** put up any money.
- **Payouts:** When a market resolves, winners are paid from **the losing user’s stake** (and the platform takes a fee). The platform never pays winners from its own funds.
- **Platform vs peer** (platform as the house) would mean the platform takes the other side of bets — that *would* put you at financial risk. We are **not** doing that. We only run an **order book**: peer vs peer. No platform capital at risk.

So: the platform is **not** matching “another’s stake” with its own money. It is matching **one user’s order with another user’s order**. Zero platform financial risk by design.

---

## 1. Why P2P-only (for now)

- **Platform risk**: If the platform seeds liquidity (AMM), it is the counterparty. When a market resolves, the pool pays winners; the platform can lose money. To be risk-free, the platform should **not** act as LP.
- **AMM later**: Re-enable AMM (platform or user LPs) once the platform has profited from fees and can afford to seed or back liquidity.
- **Today**: Only **peer-to-peer** — matched bets between users. The platform takes a fee; payouts come from the losing side to the winning side, not from the platform.

---

## 2. The “no counterparty” problem

With P2P, every position needs an **opposite** position: if Alice bets YES, someone must bet NO (or sell YES) for there to be a valid trade. If no one ever takes the other side:

- At settlement, Alice’s outcome might “win” (e.g. YES is correct), but there is **no one to pay her** — the platform doesn’t pay, and there’s no matched NO position.

So we need a model where **only matched exposure creates a real position**, and we’re clear that **unmatched interest doesn’t guarantee a payout**.

---

## 3. Options (brainstorm)

### A. Order book / match-only (recommended baseline)

- Users post **orders**: e.g. “I want to buy 100 YES at max price 0.6” or “I sell 50 NO at 0.4”.
- A **trade** only happens when two orders **match** (one buys YES, one sells YES, or one buys NO and one sells NO, at compatible prices).
- Only when a trade executes do we:
  - Debit both users’ balances
  - Create **two positions** (one YES, one NO) linked as counterparties
- At settlement:
  - Winner gets paid from the **loser’s stake** (and vice versa for the other outcome); platform takes a fee.
  - No counterparty ⇒ no position ⇒ no ambiguity. Users with unmatched orders never get a position, so they’re never “winning with no one to pay them.”

**Pros:** Clear, risk-free for platform, always solvent.  
**Cons:** Thin liquidity at the start; many orders may sit unfilled. Good UX (order book, “post your opposite order”) and maybe small incentives (e.g. “first 10 orders get a badge”) help.

**Partial fill (unequal sizes):** Orders can match **partially** when sizes differ. Example: $100 on Yes and $1 on No — we match **$1** (the minimum): both sides get a $1 position at the agreed price; the remaining $99 Yes stays on the book. This is fair: each user is only matched for the amount the other side offered. The book tracks `amount_remaining` per order; when it reaches 0 the order is fully matched. See schema `0004_p2p_partial_fill.sql` and the orders API.

---

### B. “Intent” or “request for match”

- User posts an **intent**: “I want to bet 50 on YES for market X.”
- This is **not** a position yet; it’s a **request** that shows on the market (e.g. “Alice wants to bet 50 on YES”).
- When another user **takes the other side** (“I’ll take NO for 50”), the platform **matches** them: creates two positions, debits both, links counterparties.
- Unmatched intents can expire (e.g. 24h) or stay open until someone matches or the user cancels.

**Pros:** Same as A — only matched pairs create positions; platform never pays.  
**Cons:** Similar liquidity issue; need clear UI so users understand “you don’t have a position until someone matches you.”

---

### C. Tiny “seed” liquidity (bounded risk)

- Platform provides a **very small** amount of liquidity per market (e.g. max 10–20 Credits per side, or max one small trade per user per market).
- Rest is P2P (order book or intents). So early users can always get a **small** position even if no one else is there; larger size requires a counterparty.

**Pros:** Better early UX; “something to do” from day one.  
**Cons:** Platform still has some risk (capped). Keep the cap low so max loss is acceptable.

---

### D. Refund / void if no counterparty (avoid)

- Allow one-sided “bets” and at settlement, if there’s no counterparty, **void** the bet (refund stake minus fee) or pay nothing.

**Cons:** Confusing and feels unfair (“I won but got nothing”). Not recommended.

---

## 4. Recommended path (growing from zero)

1. **Implement match-only (order book or intents)**  
   - Only create positions when two users are matched.  
   - At settlement, pay winners from losers’ stakes; platform takes a fee.  
   - No “platform pays” path.

2. **UX to encourage matching**  
   - Show **best bid/ask** and “post your opposite order.”  
   - Notifications: “Someone wants to take the other side of your order.”  
   - Optional: small non-monetary incentives for early liquidity (e.g. badges, leaderboard).

3. **Optional: small seed liquidity (C)**  
   - If you want “always something to do,” add a **strict cap** (e.g. 10 CR per market per user from platform).  
   - Document max platform loss and treat it as marketing/onboarding cost.

4. **Re-enable full AMM later**  
   - Once you have fee revenue and user base, consider bringing back AMM with **user LPs only** (or platform LPs with explicit risk budget).  
   - Platform can then earn from fee share without being the only LP.

---

## 5. Implementation notes (current codebase)

- **AMM today:** Markets get a pool (e.g. 1000 YES / 1000 NO) and `POST /api/trade` executes against the pool (platform is LP). To move to P2P-only:
  - **Option 1:** Add an env flag (e.g. `DISABLE_AMM_TRADE=1`) and return a clear error from `POST /api/trade` (“Trading is P2P-only; place or take an order”) until order-book/order flow exists.
  - **Option 2:** Create markets with **empty or zero liquidity** so AMM trade fails naturally; only allow “create position” when it’s a matched pair (new flow).
- **New pieces for P2P:** Orders table (or contracts), matching logic, and settlement that pays winner from loser’s stake and credits platform fee.

---

## 6. Summary

| Goal | Approach |
|------|----------|
| Platform risk-free | P2P only; no platform LP; payouts only from counterparty stakes |
| No “winning but no payout” confusion | Only matched pairs create positions; unmatched orders/intents don’t become positions |
| Grow from zero | Order book or intents + good UX; optional tiny seed liquidity with strict cap |
| AMM later | Re-enable when you have fee revenue; use user LPs or capped platform LP |

This keeps the platform from ever paying out users from its own balance while giving a clear path from zero users (order book / intents) to a busier, fee-generating product, with the option to add AMM when it’s sustainable.
