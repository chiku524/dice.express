# Deploying dice.express to Cloudflare

This project is set up for **Cloudflare Pages** (converged Pages + Workers): static frontend in `frontend/dist`, optional **Pages Functions** for `/api/*` proxying, and configuration in `wrangler.toml`. You can create the project and deploy entirely from the terminal, or use **Git integration** (Cloudflare builds on push) or **GitHub Actions** (CI deploys).

**Naming:** The GitHub repository is **dice.express** (with a dot). The Cloudflare Pages *project* name is **dice-express** (with a hyphen), used for the subdomain `dice-express.pages.dev` and in `wrangler.toml` / CLI. When connecting to Git, select the repo **dice.express**.

**Direct Upload vs Git:** Projects created via the CLI (`wrangler pages project create`) or dashboard **Direct Upload** are *Direct Upload* only. They do **not** show a Git connection in the dashboard (no repo name, no “connected” state)—that’s expected. You deploy by uploading built assets (e.g. with `npm run pages:deploy` or GitHub Actions). You cannot later connect such a project to GitHub; Git-based builds require a *separate* project created via **Connect to Git**.

---

## First deployment (existing dice-express project)

If you already created the **dice-express** project (via CLI or Direct Upload), do the **first deployment** from your **dice.express** repo like this:

1. **From the repo root** (with Node and npm available):
   ```bash
   npm run pages:deploy
   ```
   This builds the frontend (`frontend/dist`) and runs `wrangler pages deploy frontend/dist --project-name=dice-express`, uploading assets and your `functions/` folder to the existing project.

2. After it finishes, open **https://dice-express.pages.dev**. You should see your app (and `/api/*` will use the proxy if `BACKEND_URL` is set in the dashboard).

**Subsequent deployments:** Run `npm run pages:deploy` again whenever you want to update the site, or use the GitHub Actions workflow (Option B) so pushes to `main` deploy automatically.

---

## What’s in the repo

| Item | Purpose |
|------|--------|
| **`wrangler.toml`** | Pages project config: name `dice-express`, build output `frontend/dist`, `nodejs_compat`, Functions env (e.g. `BACKEND_URL`). |
| **`functions/api/[[path]].js`** | Pages Function that proxies `/api/*` to an external backend when `BACKEND_URL` is set. |
| **`scripts/cloudflare-setup.sh`** | Idempotent script: creates the Pages project via CLI if it doesn’t exist. |
| **`.github/workflows/deploy-cloudflare-pages.yml`** | Optional: build + deploy via GitHub Actions (Direct Upload). |

---

## Create project and deploy from the terminal (recommended)

You can create the Cloudflare Pages project and deploy without using the dashboard.

### 1. Log in and create the project

Ensure Wrangler is authenticated (browser login or env vars):

```bash
npx wrangler login
```

Create the project once (idempotent: safe to run again; skips if the project already exists):

```bash
npm run pages:project:create
```

Or run the script directly:

```bash
bash scripts/cloudflare-setup.sh
```

That runs `wrangler pages project create dice-express --production-branch main --compatibility-date 2025-02-01 --compatibility-flags nodejs_compat` only when the project does not exist. On Windows without bash, run the same command manually once:

```bash
npx wrangler pages project create dice-express --production-branch main --compatibility-date 2025-02-01 --compatibility-flags nodejs_compat
```

### 2. Build and deploy

```bash
npm run pages:deploy
```

This builds the frontend and runs `wrangler pages deploy frontend/dist --project-name=dice-express`. Your site will be at **https://dice-express.pages.dev** (and any custom domain you add in the dashboard).

### One-shot: create project + deploy

```bash
npm run pages:setup
```

Runs `pages:project:create` then `pages:deploy`.

### Optional: list or create from CLI

```bash
npx wrangler pages project list
npx wrangler pages project create dice-express --production-branch main --compatibility-date 2025-02-01 --compatibility-flags nodejs_compat
```

---

## Option A: Connect GitHub to Cloudflare

Cloudflare builds and deploys on every push. No API token in GitHub required.

### 1. Connect the repo

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Choose **GitHub** and authorize the **Cloudflare Workers and Pages** app (limit to this repo if you prefer: GitHub → Settings → Installations → configure).
3. Select the **dice.express** repository and the branch to use for production (e.g. `main`).

### 2. Configure the build

Use these settings (Framework preset: **None** or **Vite** if available):

| Setting | Value |
|--------|--------|
| **Build command** | `cd frontend && npm ci && npm run build` |
| **Build output directory** | `frontend/dist` |
| **Root directory** | *(leave empty – repo root)* |

Save and run the first deployment. Later deploys run automatically on push.

### 3. Use `wrangler.toml` as source of truth (optional)

The repo already has a `wrangler.toml` with `pages_build_output_dir = "frontend/dist"`. With the **V2 build system** and a Wrangler config in the repo, Cloudflare can use this file for project/config. Ensure the project is on the [V2 build image](https://developers.cloudflare.com/pages/configuration/build-image/#v2-build-system). If you use **Connect to Git** and the dashboard build output is `frontend/dist`, you’re aligned; you can later run `npx wrangler pages download config dice-express` to pull dashboard config into `wrangler.toml` if you want one file as source of truth.

### 4. GitHub integration behavior

- **Production branch**: Set in **Settings** → **Builds** → **Branch control** → **Production branch** (defaults to the first branch you pushed, often `main`).
- **Preview deployments**: Every pull request gets a unique preview URL (not for forks). Control which branches get previews under **Settings** → **Builds** → **Branch control** → **Preview branch** (all, none, or custom branches).
- **Skip a deploy**: In the commit message use one of: `[CI Skip]`, `[Skip CI]`, `[CF-Pages-Skip]` (case-insensitive).
- **Status in GitHub**: Build status appears as check runs on commits/PRs.

### 5. Custom domain (e.g. dice.express)

In the Pages project: **Custom domains** → **Set up a custom domain** → enter **dice.express**. If the domain is on Cloudflare, DNS is updated automatically.

---

## Option B: Deploy with GitHub Actions (Direct Upload) — auto-deploy on every push

Your codebase (the **dice.express** repo) builds in CI and deploys to the existing Cloudflare Pages project **dice-express**. Once the two GitHub secrets below are set, **every push to `main`** triggers a build and deployment automatically. No Git connection in the Cloudflare dashboard is needed; you use an API token.

### 1. Create the Pages project (one-time)

If the project doesn’t exist yet, use the terminal: `npm run pages:project:create` (or run `scripts/cloudflare-setup.sh`). Alternatively, in the dashboard: **Workers & Pages** → **Create** → **Pages** → **Direct Upload** → project name **dice-express**.

### 2. Cloudflare API token

1. [Cloudflare API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens) → **Create Token**.
2. Use a custom token with **Account** → **Cloudflare Pages** → **Edit**.
3. Create and copy the token.

### 3. GitHub secrets

In the **dice.express** repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret name | Value |
|-------------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (e.g. from Workers & Pages or zone overview). |
| `CLOUDFLARE_API_TOKEN` | The token from step 2. |

### 4. Deployments

- **Automatic:** Every push to the `main` branch runs the workflow: install deps, build frontend, deploy to **dice-express.pages.dev**.
- **Manual run:** **Actions** → **Deploy to Cloudflare Pages** → **Run workflow**.

The workflow uses `wrangler.toml` in the repo; Pages Functions (e.g. `functions/api/[[path]].js`) are included in the deployment. For Direct Upload, sensitive env (e.g. `BACKEND_URL`) must be set in the Cloudflare dashboard or via [Wrangler secrets](https://developers.cloudflare.com/workers/wrangler/configuration/#environment-variables) if you deploy from CLI.

---

## API proxy (optional)

The Function at `functions/api/[[path]].js` forwards `/api/*` to an external backend.

**Option A – Proxy to Vercel (or another origin)**  
In Cloudflare Pages: **Settings** → **Environment variables** (Production / Preview as needed):

- **Variable name:** `BACKEND_URL`  
- **Value:** e.g. `https://your-project.vercel.app`

Redeploy. Requests to `https://your-site.pages.dev/api/*` (or your custom domain) go to `BACKEND_URL/api/*`.

**Option B – No proxy**  
If `BACKEND_URL` is not set, the Function returns 503 for `/api/*`. Point the frontend at your API via build-time env (e.g. `VITE_API_ORIGIN`).

---

## Frontend environment variables

For **build-time** variables (e.g. Vite), use the **VITE_** prefix and set them in:

- **Git integration**: **Settings** → **Environment variables**.
- **Direct Upload**: same in the dashboard, or in the build step of your CI.

Examples: `VITE_LEDGER_URL`, others from `frontend/.env.example`. Rebuild after changing.

---

## Local preview

From the repo root:

```bash
# Build
npm run build:frontend

# Run Pages (static assets + Functions)
npx wrangler pages dev frontend/dist
```

To test the API proxy locally, create a `.dev.vars` file in the repo root (do not commit):

```
BACKEND_URL=https://your-api-origin.com
```

Then run `npx wrangler pages dev frontend/dist` again.

---

## Checklist

- [ ] **Option A**: **dice.express** repo connected in **Workers & Pages** → **Pages** → **Connect to Git**; build command `cd frontend && npm ci && npm run build`, output `frontend/dist`.
- [ ] **Option B**: Pages project created (Direct Upload), `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` set in GitHub Actions secrets.
- [ ] Custom domain **dice.express** added in Pages → **Custom domains** (if desired).
- [ ] If using API proxy: `BACKEND_URL` set in Pages environment variables and redeployed.
- [ ] Any `VITE_*` build env vars set; rebuild/redeploy after changes.
- [ ] Optional: run `npx wrangler pages dev frontend/dist` (and `.dev.vars` for proxy) to verify locally.

---

## References

- [Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Wrangler config for Pages](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration)
- [Branch build controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls)
- [Direct Upload with CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
