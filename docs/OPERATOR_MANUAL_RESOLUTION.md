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

## Tuning playbook (regex, seedQuery, preview)

Use this when headlines **should** resolve **Yes**/**No** (or a multi-outcome label) but markets **Void**, or when you see **false positives**.

**Dry run:** **`POST /api/resolve-markets-preview`** (same ops auth as **`resolve-markets`**) — no D1 writes; returns **`wouldResolve`**, **`outcome`**, and **`meta`** per due market.

All pattern logic lives in **`functions/lib/operator-manual-resolve.mjs`** (constants at the top, **`inferFromTitles`** for binary **`customType`**; multi-outcome uses title/substring scoring).

### Tuning — safety: where to experiment

| Do | Avoid |
|----|--------|
| Tune regexes in a **branch**, deploy to **Preview** Pages (or local **`wrangler pages dev`**) with a **copy** of real **`payload.oracleConfig`** + **`seedQuery`**. | Changing production markets’ **`resolutionDeadline`** or **`oracleConfig`** in D1 without a backup / runbook. |
| Run **`POST /api/resolve-markets-preview`**, then **`POST /api/resolve-markets`** manually against **staging** or Preview with ops secrets. | Relying on **production** cron alone to validate a regex change. |
| Prefer **adding** narrow phrases (longer, more specific regex fragments) over **broad** wildcards that match many feeds. | Loosening **token overlap** globally without checking **election** and **conflict** markets (high mis-resolution risk). |

If a bad **Yes**/**No** already settled, fix code for next time and use **`POST /api/update-market-status`** only with a clear ops policy (correcting mistakes is manual and may require balance adjustments outside this doc).

### Tuning — how to reproduce a miss or a bad call

1. **Inspect the stored market** (D1 / admin tool): **`payload.title`**, **`oracleConfig.seedQuery`**, **`seedHeadline`**, **`seedNewsSource`**, **`customType`**, **`electionEntitySlug`** (election only), **`resolutionDeadline`**, **`lastOperatorNewsFetchAt`** (throttle timestamp).
2. **Call the same search** your deployment would use: e.g. hit provider search UI or a one-off script with **`seedQuery`** (first 200 chars) and note **titles** returned.
3. **Check gates:**
   - **Token overlap:** Significant tokens from title + seed must appear in a candidate headline (`extractSignificantTokens` / **`normalizeNewsToken`** in **`functions/lib/news-market-topic.mjs`**). Short or generic **`seedQuery`** → weak anchors → no title passes overlap → **Void**.
   - **Election:** At least one **`electionEntitySlug`** token (split on `-`/`_`, length > 2) must appear **inside** the candidate title (substring match, lowercase).
   - **Yes and No both match** somewhere in the batch → **`pick`** returns **null** → **Void** after deadline (by design: ambiguous).
   - **Throttle:** Before the deadline, **`oracleConfig.lastOperatorNewsFetchAt`** plus **`OPERATOR_MANUAL_NEWS_MIN_INTERVAL_MS`** (default 6h) can skip news fetches; **`pastDeadline`** always fetches.
4. **Logs:** JSON lines with **`event":"operator_manual.*"`** from **`predictionLog`** (search Logpush). Warnings under **`[operator-manual-resolve]`** indicate failed provider calls.

### Tuning — by **`customType`**

| `customType` | Regex constants | What “Yes” is trying to catch | Typical false **Void** causes | Tuning tips |
|--------------|-----------------|--------------------------------|-------------------------------|-------------|
| **`election`** | `ELECTION_YES` / `ELECTION_NO` | Certified / projected winner / elected / opponent conceded | Headline phrasing not in regex; **slug** mismatch; overlap too strict | Add narrow alternates; fix **`electionEntitySlug`** in **`custom-news-markets.mjs`** if systematic. |
| **`olympics`** | `OLY_YES` / `OLY_NO` | Medal / official result / gold | Niche sport wording | Add sport-specific tokens carefully. |
| **`conflict`** | `CONFLICT_YES` / `CONFLICT_NO` | Ceasefire / peace deal / war ends | “Pause” vs “ceasefire”; noisy **No** hits | Tighten **No** patterns; sharpen **`seedQuery`**. |
| **`fda_drug`** | `FDA_YES` / `FDA_NO` | Approval / clearance / PDUFA | Filing vs approval | Add FDA-specific phrases. |
| **`court`** | `COURT_YES` / `COURT_NO` | Ruling / upholds / strikes down | “Court to hear” vs decided | Stronger verb requirements. |
| **`legislation`**, **`mna_ipo`**, **`macro_data`**, **`fed_operator`**, **`summit`**, **`tech_antitrust`** | **`GENERIC_YES`** / **`GENERIC_NO`** | Confirmed / signed / deal closed | Vague headlines; both Yes and No fire | Improve **`seedQuery`** at creation; add typed **`case`** branches if one category misfires. |

**Multi-outcome** **`operator_manual`:** winning outcome if one label has **≥ 2** title hits with anchor overlap and a **unique** high score; else **Void** at deadline.

### Tuning — **`seedQuery`** and anchors (no regex change)

- **`seedQuery`** is built at market creation in **`functions/lib/custom-news-markets.mjs`** (`operatorSeedMeta`). Too many generic words dilute anchors; too few miss retrieval.
- Irrelevant search results can cause **both** Yes and No to match → **Void**. **Sharpen** the query for **new** markets.

### Tuning — quick local regex check (Node)

From repo root:

```bash
node -e "
const yes = /\\b(certif|elected|wins?\\s+the)\\b/i;
const no = /\\b(conced|lost\\s+the)\\b/i;
const t = process.argv.slice(1).join(' ') || 'Jane Smith elected after Iowa caucus';
console.log({ title: t, yes: yes.test(t), no: no.test(t) });
" "Your headline here"
```

Mirror the **actual** constants from **`operator-manual-resolve.mjs`** for accurate tests. Repo tests: **`npm test`** includes **`tests/operator-manual-resolve.test.mjs`**.

### Tuning — end-to-end on Preview / staging

1. **`POST /api/resolve-markets-preview`** with **`{ "limit": 20 }`** — inspect **`previews`**.
2. **`POST /api/resolve-markets`** — real settlement; positions get **`settlementCreditedAt`** (idempotent retries skip already-credited rows).
3. **Void:** confirm balances and **`Position`** **`settlementKind`** **`void_refund`**.

### Tuning — change checklist (before merge)

- [ ] Patterns use **`/i`** and **`\\b`** where appropriate.
- [ ] **Election** tested with **and without** **`electionEntitySlug`** in titles.
- [ ] **`npm test`** passes.
- [ ] Update this doc if user-visible behavior changes.

---

## Related documentation

- **`docs/AUTO_MARKETS.md`** — Cron Worker, **`SITE_URL`**, secrets, news limits, operator playbook.
- **`docs/API.md`** — **`/api/resolve-markets`**, **`/api/resolve-markets-preview`**, ops headers.
- **`docs/ORACLE_STRATEGY.md`** — Oracle overview and source table.
- **`docs/USER_FLOWS_TRADING_AND_RISK.md`** — P2P vs AMM settlement behavior.
