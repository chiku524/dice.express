# Operator-manual tuning playbook

Companion to **`OPERATOR_MANUAL_RESOLUTION.md`**. Use this when production headlines **should** resolve **Yes**/**No** (or a multi-outcome label) but markets **Void**, or when you see **false positives**.

**Also use:** **`POST /api/resolve-markets-preview`** (same ops auth as **`resolve-markets`**) for a **dry run** — no D1 writes, returns **`wouldResolve`**, **`outcome`**, and **`meta`** per due market.

All pattern logic lives in **`functions/lib/operator-manual-resolve.mjs`** (constants at the top, **`inferFromTitles`** for binary **`customType`**; multi-outcome uses title/substring scoring).

---

## 1. Safety: where to experiment

| Do | Avoid |
|----|--------|
| Tune regexes in a **branch**, deploy to **Preview** Pages (or local **`wrangler pages dev`**) with a **copy** of real **`payload.oracleConfig`** + **`seedQuery`**. | Changing production markets’ **`resolutionDeadline`** or **`oracleConfig`** in D1 without a backup / runbook. |
| Run **`POST /api/resolve-markets-preview`**, then **`POST /api/resolve-markets`** manually against **staging** or Preview with ops secrets. | Relying on **production** cron alone to validate a regex change. |
| Prefer **adding** narrow phrases (longer, more specific regex fragments) over **broad** wildcards that match many feeds. | Loosening **token overlap** globally without checking **election** and **conflict** markets (high mis-resolution risk). |

If a bad **Yes**/**No** already settled, fix code for next time and use **`POST /api/update-market-status`** only with a clear ops policy (correcting mistakes is manual and may require balance adjustments outside this doc).

---

## 2. How to reproduce a miss or a bad call

1. **Inspect the stored market** (D1 / admin tool): **`payload.title`**, **`oracleConfig.seedQuery`**, **`seedHeadline`**, **`seedNewsSource`**, **`customType`**, **`electionEntitySlug`** (election only), **`resolutionDeadline`**, **`lastOperatorNewsFetchAt`** (throttle timestamp).
2. **Call the same search** your deployment would use: e.g. hit provider search UI or a one-off script with **`seedQuery`** (first 200 chars) and note **titles** returned.
3. **Check gates:**
   - **Token overlap:** Significant tokens from title + seed must appear in a candidate headline (`extractSignificantTokens` / **`normalizeNewsToken`** in **`functions/lib/news-market-topic.mjs`**). Short or generic **`seedQuery`** → weak anchors → no title passes overlap → **Void**.
   - **Election:** At least one **`electionEntitySlug`** token (split on `-`/`_`, length > 2) must appear **inside** the candidate title (substring match, lowercase).
   - **Yes and No both match** somewhere in the batch → **`pick`** returns **null** → **Void** after deadline (by design: ambiguous).
   - **Throttle:** Before the deadline, **`oracleConfig.lastOperatorNewsFetchAt`** plus **`OPERATOR_MANUAL_NEWS_MIN_INTERVAL_MS`** (default 6h) can skip news fetches; **`pastDeadline`** always fetches.
4. **Logs:** JSON lines with **`event":"operator_manual.*"`** from **`predictionLog`** (search Logpush). Warnings under **`[operator-manual-resolve]`** indicate failed provider calls.

---

## 3. By **`customType`**: intent, common misses, tuning tips

| `customType` | Regex constants | What “Yes” is trying to catch | Typical false **Void** causes | Tuning tips |
|--------------|-----------------|--------------------------------|-------------------------------|-------------|
| **`election`** | `ELECTION_YES` / `ELECTION_NO` | Certified / projected winner / elected / opponent conceded | Headline phrasing not in regex; **slug** mismatch; overlap too strict | Add narrow alternates; fix **`electionEntitySlug`** in **`custom-news-markets.mjs`** if systematic. |
| **`olympics`** | `OLY_YES` / `OLY_NO` | Medal / official result / gold | Niche sport wording | Add sport-specific tokens carefully. |
| **`conflict`** | `CONFLICT_YES` / `CONFLICT_NO` | Ceasefire / peace deal / war ends | “Pause” vs “ceasefire”; noisy **No** hits | Tighten **No** patterns; sharpen **`seedQuery`**. |
| **`fda_drug`** | `FDA_YES` / `FDA_NO` | Approval / clearance / PDUFA | Filing vs approval | Add FDA-specific phrases. |
| **`court`** | `COURT_YES` / `COURT_NO` | Ruling / upholds / strikes down | “Court to hear” vs decided | Stronger verb requirements. |
| **`legislation`**, **`mna_ipo`**, **`macro_data`**, **`fed_operator`**, **`summit`**, **`tech_antitrust`** | **`GENERIC_YES`** / **`GENERIC_NO`** | Confirmed / signed / deal closed | Vague headlines; both Yes and No fire | Improve **`seedQuery`** at creation; add typed **`case`** branches if one category misfires. |

**Multi-outcome** **`operator_manual`:** winning outcome if one label has **≥ 2** title hits with anchor overlap and a **unique** high score; else **Void** at deadline.

---

## 4. Tuning **`seedQuery`** and anchors (no regex change)

- **`seedQuery`** is built at market creation in **`functions/lib/custom-news-markets.mjs`** (`operatorSeedMeta`). Too many generic words dilute anchors; too few miss retrieval.
- Irrelevant search results can cause **both** Yes and No to match → **Void**. **Sharpen** the query for **new** markets.

---

## 5. Quick local regex check (Node)

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

---

## 6. End-to-end on Preview / staging

1. **`POST /api/resolve-markets-preview`** with **`{ "limit": 20 }`** — inspect **`previews`**.
2. **`POST /api/resolve-markets`** — real settlement; positions get **`settlementCreditedAt`** (idempotent retries skip already-credited rows).
3. **Void:** confirm balances and **`Position`** **`settlementKind`** **`void_refund`**.

---

## 7. Change checklist (before merge)

- [ ] Patterns use **`/i`** and **`\\b`** where appropriate.
- [ ] **Election** tested with **and without** **`electionEntitySlug`** in titles.
- [ ] **`npm test`** passes.
- [ ] Update **`OPERATOR_MANUAL_RESOLUTION.md`** if user-visible behavior changes.

---

## Related

- **`OPERATOR_MANUAL_RESOLUTION.md`** — Overview, env vars, cron, settlement table.
- **`API.md`** — **`resolve-markets`**, **`resolve-markets-preview`**.
