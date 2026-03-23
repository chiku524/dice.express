# Cloudflare: Deploy & Storage (D1, R2, KV)

This doc covers **deploying** dice.express to Cloudflare Pages and configuring **storage** (D1, R2, KV) so the entire API runs on Cloudflare with no Supabase or Vercel backend.

---

# Part 1 — Deploy

This project is set up for **Cloudflare Pages** (converged Pages + Workers): static frontend in `frontend/dist`, **Pages Functions** for `/api/*`, and configuration in `wrangler.toml`. You can create the project and deploy from the terminal, or use **Git integration** (Cloudflare builds on push) or **GitHub Actions** (CI deploys).

**Naming:** The GitHub repository is **dice.express** (with a dot). The Cloudflare Pages *project* name is **dice-express** (with a hyphen), used for the subdomain `dice-express.pages.dev` and in `wrangler.toml` / CLI.

**Direct Upload vs Git:** Projects created via the CLI or dashboard **Direct Upload** are Direct Upload only. They do **not** show a Git connection in the dashboard. You deploy by uploading built assets (e.g. `npm run pages:deploy` or GitHub Actions). Git-based builds require a *separate* project created via **Connect to Git**.

---

## Your site URLs

| URL | When it works |
|-----|----------------|
| **https://dice-express.pages.dev** | Always, right after a successful deploy. |
| **https://dice.express** | Only after you add **dice.express** as a custom domain (see below). You must own the domain and have its DNS on Cloudflare. |

---

## Custom domain (dice.express)

1. You must own the domain dice.express and have it as a **zone in the same Cloudflare account**.
2. **Option A — Terminal:** From repo root: `export CLOUDFLARE_ACCOUNT_ID=...` and `export CLOUDFLARE_API_TOKEN=...`, then `npm run pages:custom-domain` or `bash scripts/pages-add-custom-domain.sh`.
3. **Option B — Dashboard:** Workers & Pages → dice-express → **Custom domains** → Set up a custom domain → enter **dice.express** (and optionally **www.dice.express**).

If the zone is on Cloudflare, DNS is usually updated automatically. Otherwise add a **CNAME**: `dice.express` → `dice-express.pages.dev`.

---

## First deployment

1. From the repo root: `npm run pages:deploy` (builds frontend and deploys to project **dice-express**).
2. Open **https://dice-express.pages.dev**. Subsequent deploys: run `npm run pages:deploy` again or use GitHub Actions.

**If you see `504 Gateway Timeout` or "upstream request timeout"**: This is **Cloudflare’s API** timing out when wrangler calls `GET /accounts/.../pages/projects/dice-express`. It is not caused by your config or env vars. **Your project and all env secrets/vars are unchanged** — nothing is lost. The CI workflow uses longer timeouts (`CF_HTTP_TIMEOUT`, `CF_BULK_TIMEOUT`) and 5 retries with 90s delay. If CI still fails, **run the deploy from your own machine** (often succeeds when CI fails due to different network path): `npm run pages:deploy`. Same project, same env vars. If you prefer to avoid Direct Upload entirely, you can create a new Pages project with **Connect to Git** and point it at this repo (you would then need to re-add env vars to that new project).

---

## What's in the repo

| Item | Purpose |
|------|--------|
| **`wrangler.toml`** | Pages project config: name `dice-express`, build output `frontend/dist`, D1/R2/KV/**Vectorize**/**AI** bindings, `[vars]`, optional `BACKEND_URL`. |
| **`functions/api/[[path]].js`** | Pages Function: serves `/api/*` from D1 when `DB` is bound, else proxies to `BACKEND_URL` if set. |
| **`scripts/cloudflare-setup.sh`** | Idempotent: creates the Pages project via CLI if it doesn't exist. |
| **`.github/workflows/deploy-cloudflare-pages.yml`** | Optional: build + deploy via GitHub Actions (Direct Upload). |

---

## Create project and deploy from the terminal

```bash
npx wrangler login
npm run pages:project:create   # or: bash scripts/cloudflare-setup.sh
npm run pages:deploy
```

One-shot: `npm run pages:setup` runs `pages:project:create` then `pages:deploy`.

---

## Option A: Connect GitHub to Cloudflare

Cloudflare builds and deploys on every push. No API token in GitHub required.

1. Dashboard → Workers & Pages → Create → Pages → **Connect to Git**.
2. Choose GitHub, select **dice.express** repo and production branch (e.g. `main`).
3. **Build command:** `cd frontend && npm ci && npm run build` — **Build output directory:** `frontend/dist` — **Root directory:** (empty).
4. Custom domain: in the Pages project → Custom domains → add **dice.express**.

---

## Option B: GitHub Actions (Direct Upload)

Build in CI and deploy to the existing **dice-express** project. Set GitHub secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`. Every push to `main` triggers deploy. Manual run: Actions → Deploy to Cloudflare Pages → Run workflow.

---

## API: D1 (native) or proxy

- **D1 (recommended):** Configure D1 (and optionally KV, R2) in `wrangler.toml`, create DB and run schema, deploy. Do **not** set `BACKEND_URL`. See **Part 2 — Storage** below.
- **Proxy:** Set `BACKEND_URL` in Pages env (e.g. `https://your-project.vercel.app`). Requests to `/api/*` go to `BACKEND_URL/api/*`. If D1 is bound, D1 is used and proxy is skipped.
- **Neither:** Function returns 503 for `/api/*`.

---

## Local preview

```bash
npm run build:frontend
npx wrangler pages dev frontend/dist
```

For D1 locally: create D1 and apply schema with `--local`; do not set `BACKEND_URL` in `.dev.vars`. See Part 2.

---

# Part 2 — Storage (D1, R2, KV)

dice.express can run its **entire API on Cloudflare** using **D1** (SQL), **R2** (object storage), and **KV** (cache), with no Supabase or Vercel backend.

## Data persistence

When **D1** is bound (`env.DB` in `wrangler.toml`):

- **All mutable data persists in D1**: contracts (markets, positions, pools), user balances, contract status. Reads and writes go to D1 only (no proxy).
- **KV** caches GET `/api/markets` by source (60s TTL).
- **R2** backs up contract payloads on every write (`store-contract`, POST `/api/markets`, `/api/trade`, `/api/create-position`, `/api/update-market-status`) to `contracts/{contractId}.json`. Fire-and-forget.

| Storage | Role |
|--------|------|
| **D1** | Primary: `contracts`, `user_balances`. All API reads/writes when bound. |
| **KV** | Cache for **`GET /api/markets`** (default sort). Requests with **`sort=activity`** or **`sort=p2p`** skip this cache so **`openOrderCount`** stays fresh. |
| **R2** | Backup: contract payloads on store/update. |
| **Vectorize** | Index **`dice-express-market-embeddings`** (768-dim cosine) for auto-seed embedding dedupe. Create once: `npx wrangler vectorize create dice-express-market-embeddings --dimensions=768 --metric=cosine`. |
| **Workers AI** | Binding **`AI`** — model **`@cf/baai/bge-base-en-v1.5`** for market text embeddings (used with Vectorize). |

**Vars (see `wrangler.toml`):** e.g. **`AUTO_MARKETS_ZERO_LIQUIDITY`**, **`MARKET_EMBED_SIMILARITY_MIN`**, optional **`MARKET_EMBED_BATCH_SIZE`**, **`PREDICTION_MAINTENANCE_SECRET`**. Secrets (API keys, cron secret) are set in the Pages dashboard.

If **BACKEND_URL** is set and D1 is not bound, `/api/*` is proxied to that origin.

---

## 1. Create D1 and run schema

```bash
npx wrangler d1 create dice-express-db
```

Edit **`wrangler.toml`**: set `database_id` under `[[d1_databases]]`.

Apply schema (once per environment):

```bash
npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0000_initial.sql
npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0001_users.sql
# ... 0002_p2p_orders.sql, 0003_deposits_withdrawals.sql, etc.
npx wrangler d1 execute dice-express-db --local --file=./schema/d1/0000_initial.sql
npx wrangler d1 execute dice-express-db --local --file=./schema/d1/0001_users.sql
# ... (same for local)
```

---

## 2. Create R2 bucket (optional)

```bash
npx wrangler r2 bucket create dice-express-r2
```

Binding is in `wrangler.toml` as `R2`.

---

## 3. Create KV namespace (optional)

```bash
npx wrangler kv namespace create DICE_KV
npx wrangler kv namespace create DICE_KV --preview
```

Edit **`wrangler.toml`**: set `id` under `[[kv_namespaces]]`.

---

## 3b. Vectorize + Workers AI (automated market dedupe)

1. Create the index (once per account):  
   `npx wrangler vectorize create dice-express-market-embeddings --dimensions=768 --metric=cosine`
2. Ensure **`wrangler.toml`** includes **`[[vectorize]]`** (`binding = "VECTORIZE"`, `index_name = "dice-express-market-embeddings"`) and **`[ai]`** (`binding = "AI"`).
3. After wiping prediction markets in D1, clear or recreate the Vectorize index (or use **`POST /api/prediction-maintenance`**) so vectors stay aligned. See **`PREDICTION_MARKETS.md`** (Maintenance).

Local **`wrangler pages dev`** may run without AI/Vectorize bindings; embedding steps no-op safely.

---

## 4. Local development with D1

1. Set `database_id` in `wrangler.toml` and apply schema **locally**.
2. `npm run build:frontend` then `npx wrangler pages dev frontend/dist`. Do **not** set `BACKEND_URL` in `.dev.vars`.

---

## 5. Deploy with D1

- **Git-based:** D1/KV bindings from `wrangler.toml` apply when Cloudflare builds. Apply migrations to **remote** D1 (`wrangler d1 execute ... --remote`).
- **Direct Upload:** Same; apply migrations to remote D1. No need to set `BACKEND_URL`; API runs on the edge.

---

## 6. Migrating from Supabase

Export contracts and user_balances from Supabase to JSON/CSV. Map to D1 schema (`contract_id`, `template_id`, `payload` as JSON string, `party`, `status`, etc.). Run `wrangler d1 execute dice-express-db --remote --file=./inserts.sql` or a small script.

---

## 7. Switching from proxy to D1-only

Create D1, run schema, set `database_id` in `wrangler.toml` (and optionally R2/KV). Deploy. Remove or leave unset **`BACKEND_URL`** in Cloudflare Pages env. Frontend can keep calling relative `/api/*`.

---

## File reference

| Path | Purpose |
|------|--------|
| `wrangler.toml` | D1, R2, KV bindings. |
| `schema/d1/*.sql` | D1 table definitions. |
| `functions/lib/cf-storage.mjs` | D1/KV/R2 helpers. |
| `functions/api/[[path]].js` | Router: D1-backed routes or proxy to `BACKEND_URL`. |

---

## References

- [Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [D1](https://developers.cloudflare.com/d1/)
- [R2](https://developers.cloudflare.com/r2/)
- [KV](https://developers.cloudflare.com/kv/)
