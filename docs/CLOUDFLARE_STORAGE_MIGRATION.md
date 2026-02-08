# Cloudflare storage migration (D1, R2, KV)

dice.express can run its **entire API on Cloudflare** using **D1** (SQL), **R2** (object storage), and **KV** (cache), with no Supabase or Vercel backend required.

## Overview

| Storage | Role |
|--------|------|
| **D1** | Primary: `contracts` and `user_balances` tables (replaces Supabase). |
| **KV** | Optional: cache for GET `/api/markets` (short TTL). |
| **R2** | Optional: backup or large payloads; bindings are set but not required for core API. |

The same API surface is supported: `/api/get-contracts`, `/api/store-contract`, `/api/update-contract-status`, `/api/get-user-balance`, `/api/update-user-balance`, `/api/markets`, `/api/pools`, `/api/trade`, `/api/update-market-status`, `/api/create-position`.

**Behavior:**

- If **`env.DB`** (D1) is bound in `wrangler.toml`, the Function serves these routes from D1 (and optionally KV/R2). No proxy.
- If **`BACKEND_URL`** is set and D1 is not bound, `/api/*` is proxied to that URL (e.g. Vercel) as before.
- If neither is set, the Function returns 503 with a hint.

---

## 1. Create D1 database and run schema

From the repo root:

```bash
# Create the database (copy the database_id from the output)
npx wrangler d1 create dice-express-db
```

Edit **`wrangler.toml`**: set `database_id` under `[[d1_databases]]` to the id from the command output (replace `YOUR_D1_DATABASE_ID`).

Apply the schema (run once per environment):

```bash
# Remote (production)
npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0000_initial.sql

# Local (for wrangler pages dev)
npx wrangler d1 execute dice-express-db --local --file=./schema/d1/0000_initial.sql
```

---

## 2. Create R2 bucket (optional)

```bash
npx wrangler r2 bucket create dice-express-r2
```

No id is needed in `wrangler.toml` for R2; the bucket name is enough. The binding is already in `wrangler.toml` as `R2`. Use it later for backups or large payloads.

---

## 3. Create KV namespace (optional, for cache)

```bash
# Production
npx wrangler kv namespace create DICE_KV

# Preview (for local/preview deployments)
npx wrangler kv namespace create DICE_KV --preview
```

Edit **`wrangler.toml`**: set `id` under `[[kv_namespaces]]` to the production namespace id (replace `YOUR_KV_NAMESPACE_ID`). For preview, you can add a second entry with `preview_id` (see [Wrangler KV docs](https://developers.cloudflare.com/workers/wrangler/configuration/#kv-namespaces)).

---

## 4. Local development with D1

1. Ensure **`database_id`** is set in `wrangler.toml` and schema has been applied **locally** (step 1).
2. From repo root:

```bash
npm run build:frontend
npx wrangler pages dev frontend/dist
```

Do **not** set `BACKEND_URL` in `.dev.vars` if you want to use D1 locally. With D1 bound, the Function will use the local D1 database.

To seed data, use the same API (e.g. POST `/api/markets`, POST `/api/store-contract`, or run one-off `wrangler d1 execute` with INSERTs).

---

## 5. Deploy with D1 (Cloudflare Pages)

- **Git-based deploy:** D1 and KV bindings from `wrangler.toml` are applied when Cloudflare builds. Ensure `database_id` (and KV `id` if used) are set and the schema has been applied to the **remote** D1 database (`wrangler d1 execute ... --remote`).
- **Direct Upload:** Same: run `wrangler pages deploy frontend/dist`; bindings come from `wrangler.toml`. Apply migrations to the remote D1 DB.

No need to set `BACKEND_URL` in the dashboard when using D1; the API runs on the edge.

---

## 6. Migrating data from Supabase

There is no built-in ETL. To move existing data:

1. Export from Supabase (e.g. `contracts` and `user_balances` tables) to JSON/CSV.
2. Map rows to the D1 schema (`contract_id`, `template_id`, `payload` as JSON string, `party`, `status`, `created_at`, `updated_at` for contracts; `party`, `balance`, `created_at`, `updated_at` for user_balances).
3. Run `wrangler d1 execute dice-express-db --remote --file=./path/to/inserts.sql` or use a small script that reads the export and issues D1 inserts via `wrangler d1 execute` or the HTTP API.

---

## 7. Switching from proxy to D1-only

1. Create D1, run schema, set `database_id` in `wrangler.toml` (and optionally R2/KV).
2. Deploy (Git or Direct Upload).
3. Remove or leave unset **`BACKEND_URL`** in Cloudflare Pages env so the Function does not proxy.
4. Frontend can keep calling relative `/api/*`; no change needed if the app is served from the same origin.

---

## File reference

| Path | Purpose |
|------|--------|
| `wrangler.toml` | D1, R2, KV bindings; `database_id` and KV `id` must be set after creating resources. |
| `schema/d1/0000_initial.sql` | D1 table definitions. |
| `functions/lib/cf-storage.mjs` | D1/KV/R2 helpers used by the API. |
| `functions/lib/amm.mjs` | AMM logic (ESM) for trade/pool. |
| `functions/api/[[path]].js` | Single router: D1-backed routes or proxy to `BACKEND_URL`. |

---

## References

- [D1](https://developers.cloudflare.com/d1/)
- [R2](https://developers.cloudflare.com/r2/)
- [KV](https://developers.cloudflare.com/kv/)
- [Pages Functions](https://developers.cloudflare.com/pages/functions/)
