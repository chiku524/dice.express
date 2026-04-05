# API Reference

## Cloudflare Pages API (production)

The live product serves **`/api/*`** from **Cloudflare Pages Functions** with **D1** as the system of record. Base URL is your deployment (e.g. `https://dice.express` or `https://dice-express.pages.dev`). No separate backend host is required when D1 and bindings are configured.

### Ops-only routes (optional secret)

If **`PRIVILEGED_API_SECRET`** and/or **`AUTO_MARKETS_CRON_SECRET`** is set in the Pages environment, the following **`POST`** handlers require a matching secret (otherwise they return **401**):

- **`/api/add-credits`**, **`/api/update-user-balance`**, **`/api/store-contract`**, **`/api/create-position`**, **`/api/resolve-markets`**, **`/api/resolve-markets-preview`**

Send **`X-Privileged-Secret`** (for `PRIVILEGED_API_SECRET`) and/or **`X-Cron-Secret`** (for `AUTO_MARKETS_CRON_SECRET`). Body fields **`privilegedSecret`** / **`cronSecret`** are accepted as alternates. If **neither** env var is set, these routes stay **open** — no secret headers required — which is fine for many deployments (local dev and production until you opt in to locking them down). The **auto-markets cron Worker** then does **not** need matching secrets on the Worker for **`POST /api/resolve-markets`** to succeed.

When you **do** set **`PRIVILEGED_API_SECRET`** on Pages, set the **same** value on the Worker so scheduled **`resolve-markets`** calls include **`X-Privileged-Secret`**.

**`update-market-status`** and **`update-contract-status`** are not gated by this helper; restrict or authenticate those callers separately if you use them from scripts or tools.

### Core endpoints (summary)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/health` | Liveness. |
| `GET` | `/api/markets` | Lists virtual markets. Query: `source`, `status`. **`sort=activity`** or **`sort=p2p`** sorts by open P2P limit-order count (skips KV cache for fresh counts). Each market includes **`openOrderCount`**. |
| `POST` | `/api/markets` | Creates a market (**`source: 'user'`** is rejected). Automated creation uses **`/api/auto-markets`**. |
| `GET` | `/api/pools?marketId=…` | Liquidity pool state (AMM). |
| `POST` | `/api/trade` | AMM trade (may be disabled when pools have zero liquidity). |
| `GET` / `POST` | `/api/orders` | P2P limit orders: list, place, cancel. |
| `POST` | `/api/create-position` | P2P / structured positions. **Ops secret** if configured (see above). |
| `GET` / `POST` | `/api/auto-markets` | **`action=events`**, **`probe`**, **`seed`**, **`seed_all`**. Seeding may require **`X-Cron-Secret`** if **`AUTO_MARKETS_CRON_SECRET`** is set on Pages. See **`PREDICTION_MARKETS.md`**. |
| `POST` | `/api/prediction-maintenance` | Embedding / Vectorize ops: **`backfill_embeddings`**, **`prune_settled_embeddings`**, **`delete_embeddings_by_ids`**. Auth: **`X-Maintenance-Secret`** (**`PREDICTION_MAINTENANCE_SECRET`**) or shared cron secret. See **`PREDICTION_MARKETS.md`** (Maintenance). |
| `POST` | `/api/resolve-markets` | Resolves due markets from oracle APIs and **operator-manual** markets; settles positions (**P2P** and **AMM** winners; **`Void`** refunds). **Ops secret** if configured. See **`docs/OPERATOR_MANUAL_RESOLUTION.md`**. |
| `POST` | `/api/resolve-markets-preview` | **Dry run:** same due filter and **`resolveOutcome(..., { dryRun: true })`**; **no** D1 settlement. Body optional **`{ "limit": 40 }`**. Same ops auth as **`resolve-markets`**. |
| `GET` | `/api/auto-markets?action=probe` | Includes **`resolveQueueSummary`** (`dueCount`, **`dueSample`**) for operator dashboard / automation page. |
| `POST` | `/api/update-market-status` | Manual status / settlement updates. |
| `POST` | `/api/deposit-crypto` | Credits Pips after on-chain verification (secret). |
| `POST` | `/api/process-withdrawals` | Sends pending withdrawals (secret). |

### Implementation pointers

- Router: `functions/api/[[path]].js`
- Storage: `functions/lib/cf-storage.mjs` (D1, KV, R2)
- Auto-markets data: `functions/lib/data-sources.mjs` (**`AUTO_MARKET_SOURCES`**)
- Dedupe: `functions/lib/market-dedupe.mjs` (lexical + semantic); **`functions/lib/market-embeddings.mjs`** (Workers AI + Vectorize)
- Resolution: `functions/lib/resolve-markets.mjs`, `functions/lib/operator-manual-resolve.mjs` (custom **`operator_manual`** / **`customType`** markets)

---

## Historical ledger API (Canton / DAML)

Canton/DAML command examples, template sketches, and legacy query notes are archived in **[HISTORICAL_CANTON_DAML_API.md](./HISTORICAL_CANTON_DAML_API.md)**. They do **not** describe the live Cloudflare **`/api/*`** surface.
