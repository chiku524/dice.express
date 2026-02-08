#!/usr/bin/env bash
# Add custom domain(s) to the Cloudflare Pages project (dice-express).
# Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (env or .env).
# The domain (e.g. dice.express) must be a zone in the same Cloudflare account.
#
# Usage:
#   export CLOUDFLARE_ACCOUNT_ID=your_account_id
#   export CLOUDFLARE_API_TOKEN=your_token
#   ./scripts/pages-add-custom-domain.sh
# Or with one domain:  ./scripts/pages-add-custom-domain.sh example.com

set -e
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
API_TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
PROJECT_NAME="${CLOUDFLARE_PAGES_PROJECT:-dice-express}"
BASE_URL="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/domains"

# Domains to add: default dice.express + www, or pass as args
if [ $# -ge 1 ]; then
  DOMAINS=("$@")
else
  DOMAINS=("dice.express" "www.dice.express")
fi

for domain in "${DOMAINS[@]}"; do
  echo "Adding custom domain: ${domain}"
  resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -d "{\"name\": \"${domain}\"}")
  http_code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "  OK: ${domain}"
    echo "$body" | grep -q '"success":true' || echo "  (check response: $body)"
  else
    echo "  Failed (HTTP ${http_code}): $body"
  fi
done

echo "Done. If the zone is on Cloudflare, DNS may be updated automatically."
echo "Otherwise add a CNAME record: ${DOMAINS[0]} -> ${PROJECT_NAME}.pages.dev"
