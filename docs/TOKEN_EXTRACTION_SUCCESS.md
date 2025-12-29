# Token Extraction from Browser Network Tab

## Success! ✅

I was able to extract the Keycloak access token from the network tab logs you provided.

## Token Details

**Extracted from:** Authorization header in network requests  
**Token Type:** Bearer token (JWT)  
**Client:** `account-console`  
**User:** nico (Nico Chikuji)

### Token Expiration

⚠️ **Important:** This token expires at Unix timestamp `1766990816`

To check if it's still valid:
- Current time: Check with `date +%s` (Unix timestamp)
- Token expires: `1766990816`
- If current time > expiration, token is expired

## How to Extract Token in Future

1. **Open Keycloak account page** (while logged in)
2. **Open Developer Tools** (F12)
3. **Go to Network tab**
4. **Refresh the page** or navigate to any account section
5. **Click on any request** (e.g., `/account/applications`)
6. **Go to Headers tab**
7. **Find `authorization` header** in Request Headers
8. **Copy the token** (everything after `Bearer `)

## Using the Token

The token can be used for:
- Deploying DAR files to Canton
- Making authenticated API requests
- Accessing protected endpoints

### Example Deployment:

```bash
curl -X POST "https://participant.dev.canton.wolfedgelabs.com/v2/packages" \
  -H "Content-Type: application/octet-stream" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --data-binary "@.daml/dist/prediction-markets-test-1.0.0.dar"
```

## Token Refresh

When the token expires:
1. **Get a new token** from the browser network tab (same process)
2. **Or use the Keycloak token endpoint** to get a fresh token programmatically

See `docs/KEYCLOAK_AUTH_TOKEN.md` for token endpoint method.

