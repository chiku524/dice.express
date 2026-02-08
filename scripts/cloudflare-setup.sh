#!/usr/bin/env bash
# Ensure the Cloudflare Pages project exists (idempotent). Create it via CLI if missing.
# Repo name on GitHub is dice.express; Cloudflare project name is dice-express (subdomain: dice-express.pages.dev).
# Requires: npx wrangler (and CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID, or wrangler login)
# Usage: ./scripts/cloudflare-setup.sh   or   bash scripts/cloudflare-setup.sh

set -e
PROJECT_NAME="${CLOUDFLARE_PAGES_PROJECT:-dice-express}"
PRODUCTION_BRANCH="${CLOUDFLARE_PRODUCTION_BRANCH:-main}"

if npx wrangler pages project list 2>/dev/null | grep -q "$PROJECT_NAME"; then
  echo "Pages project '$PROJECT_NAME' already exists. Skipping create."
  exit 0
fi

echo "Creating Pages project '$PROJECT_NAME' (production branch: $PRODUCTION_BRANCH)..."
npx wrangler pages project create "$PROJECT_NAME" \
  --production-branch "$PRODUCTION_BRANCH" \
  --compatibility-date 2025-02-01 \
  --compatibility-flags nodejs_compat

echo "Done. Deploy with: npm run pages:deploy"
