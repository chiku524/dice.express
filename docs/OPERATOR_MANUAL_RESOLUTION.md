# Operator-manual markets: automated resolution and void refunds

Custom **outcome** markets seeded from hot news (elections, Olympics, conflicts, FDA, courts, legislation, etc.) use **`oracleSource: 'operator_manual'`** with **`oracleConfig.customType`** and **`resolutionDeadline`**. They are no longer “manual only”: **`POST /api/resolve-markets`** can settle them automatically using **news search + headline heuristics**, and **`Void`** when the deadline passes without a clear Yes/No signal.

**Code:** `functions/lib/operator-manual-resolve.mjs` (inference), `functions/lib/resolve-markets.mjs` (scheduling + orchestration), `functions/lib/custom-news-markets.mjs` (stores **`seedNewsSource`** / **`seedQuery`** on creation).

---

## When a market is “due”

| Condition | Effect |
|-----------|--------|
| **`now >= payload.resolutionDeadline`** | Market is due. `resolveOutcome` runs the operator-manual path: fetch titles, infer **Yes** / **No**, or **Void** if past deadline and still ambiguous. |
| **Before deadline** | Not due by default, so cron will **not** call inference yet (avoids extra news API usage). |
| **`OPERATOR_MANUAL_RESOLVE_BEFORE_DEADLINE=1`** (or **`true`**) on **Pages** | If the market has **`oracleConfig.customType`** and **`createdAt` is at least 6 hours ago**, the market is treated as due **even before** the deadline. Then a clear headline can settle **Yes** / **No** early; if nothing matches, resolution stays **unresolved** until the next cron tick or until the deadline triggers **Void**. |

Markets **without** `resolutionDeadline` are never due for this path. **`operator_manual`** without **`customType`** only **Void**s once the deadline passes (no typed heuristics).

**Multi-outcome** markets with **`oracleSource: operator_manual`** resolve via **outcome label** matches in news titles (unique best score ≥ 2 hits with anchor overlap), else **`Void`** at **`resolutionDeadline`**. Other **`MultiOutcome`** sources remain skipped by automated oracle resolution.

---

## Environment variables (Cloudflare **Pages** project)

Set in **Pages → Settings → Environment variables** (Production / Preview as needed).

| Variable | Required | Description |
|----------|----------|-------------|
| **`OPERATOR_MANUAL_RESOLVE_BEFORE_DEADLINE`** | No | If **`1`** or **`true`**, enables the **6h-after-creation** due check for **`customType`** markets so they can resolve **before** `resolutionDeadline` when headlines are unambiguous. |
| **`OPERATOR_MANUAL_NEWS_MIN_INTERVAL_MS`** | No | Minimum milliseconds between **pre-deadline** news fetches per market (default **21600000** = 6h). **Ignored** once **`resolutionDeadline`** has passed (final resolution always attempts a fetch). Writes **`oracleConfig.lastOperatorNewsFetchAt`**. |
| **News API keys** | Recommended | At least one of **`GNEWS_API_KEY`**, **`PERIGON_API_KEY`**, **`NEWSDATA_API_KEY`**, **`NEWSAPI_AI_KEY`** so title search returns data. If **none** are set, inference sees **no titles**; after the deadline the market still **Void**s (refunds), but **Yes**/**No** from news will not trigger. |

Resolution search prefers **`oracleConfig.seedNewsSource`** from market creation (the feed that produced the event: gnews, perigon, etc.). If that source has no key, the worker falls back to other configured providers. See **`docs/AUTO_MARKETS.md`** (API keys on Pages).

---

## Cron and manual triggers

No separate Worker is required. The same schedule that runs **`POST /api/resolve-markets`** covers operator-manual markets:

- **Recommended:** Deploy **`workers/auto-markets-cron`** so each run calls **`seed_all`** then **`resolve-markets`** (default **hourly**). See **`docs/AUTO_MARKETS.md`**.
- **Manual:**  
  `curl -X POST "https://YOUR_SITE/api/resolve-markets" -H "Content-Type: application/json" -H "X-Privileged-Secret: …"`  
  (or **`X-Cron-Secret`** if you use **`AUTO_MARKETS_CRON_SECRET`** — same rules as other ops routes; see **`docs/API.md`**.)
- **Dry-run (ops):** **`POST /api/resolve-markets-preview`** — same auth as **`resolve-markets`**; optional body **`{ "limit": 40 }`**. Returns **`wouldResolve`**, **`outcome`**, and **`meta`** per scanned due market; **no** settlement writes.
- **Public queue snapshot:** **`GET /api/auto-markets?action=probe`** includes **`resolveQueueSummary`** (`dueCount`, **`dueSample`** of up to 25 markets). The **Automation status** page in the app displays this.

---

## Outcomes and settlement

| Outcome | Behavior |
|---------|----------|
| **Yes** / **No** / **multi-outcome string** | **P2P** ( **`counterpartyPositionId`** ): winners get **`2 × amount × (1 − 2% fee)`**. **AMM / pool-only** positions: winners get **`amount × (1 − 2% fee)`** per share (redemption-style). |
| **Void** (or **`Refund`**) | **Every** **`Position`** on that **`marketId`** is credited **`costPips`** if stored, otherwise **`amount × price`**. |

**Idempotency:** After a successful credit, positions store **`settlementCreditedAt`**, **`settlementOutcome`**, **`settlementKind`** (`void_refund` \| `p2p_winner` \| `amm_winner`), **`settlementPayoutPips`**. Retrying **`resolve-markets`** or **`update-market-status`** skips already-settled positions.

**P2P-first deployments:** Keep **`DISABLE_AMM_TRADE=1`** (and typically **`AUTO_MARKETS_ZERO_LIQUIDITY=1`**) in **`wrangler.toml`** until you accept pool risk; AMM payout logic remains in code for when you re-enable trading.

**Operator override:** **`POST /api/update-market-status`** with **`status: "Settled"`** and **`resolvedOutcome`** uses the same **`settleVirtualMarketPositions`** helper.

**Structured logs:** Operator-manual resolution emits **`predictionLog`** events such as **`operator_manual.resolved`**, **`operator_manual.void_ambiguous`**, **`operator_manual.multi_resolved`**, **`operator_manual.multi_void`** (JSON lines, searchable in Logpush).

---

## How inference works (high level)

1. Build a search query from **`oracleConfig.seedQuery`**, else market **title** / **`seedHeadline`**.
2. Fetch article titles from configured news APIs (see `functions/lib/operator-manual-resolve.mjs`).
3. Require **token overlap** between each candidate title and anchors derived from the market title + seed headline (same token helpers as feed-topic news).
4. For **`customType`** (election, olympics, conflict, fda_drug, court, …), apply **Yes** / **No** regex families. If **both** fire across the batch, the result is treated as **ambiguous** (no auto Yes/No from that pass).
5. **After deadline:** ambiguous → **`Void`**. **Before deadline** (early mode only): ambiguous → stay open.
6. **Multi-outcome `operator_manual`:** score each outcome label by counting news titles that share anchor overlap and contain the label (length ≥ 3). A **unique** top score **≥ 2** wins; else **`Void`** at deadline.

Heuristics can be wrong or miss nuanced outcomes; **`Void`** is the intentional fallback when automation cannot justify a single outcome.

---

## Tuning playbook (full)

See **`docs/OPERATOR_MANUAL_TUNING.md`** — regex tuning, **`seedQuery`**, **`resolve-markets-preview`**, throttle field **`lastOperatorNewsFetchAt`**, and **`npm test`** for **`operator-manual-resolve`**.

---

## Related documentation

- **`docs/OPERATOR_MANUAL_TUNING.md`** — Full tuning playbook.
- **`docs/AUTO_MARKETS.md`** — Cron Worker, **`SITE_URL`**, secrets, news limits.
- **`docs/API.md`** — **`/api/resolve-markets`**, **`/api/resolve-markets-preview`**, ops headers.
- **`docs/ORACLE_STRATEGY.md`** — Oracle overview and source table.
- **`docs/ALGORITHMS_AND_RISK.md`** — P2P vs AMM settlement behavior.
