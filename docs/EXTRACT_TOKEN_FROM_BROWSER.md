# Extracting Keycloak Token from Browser

## Method: Network Tab

When you're logged into the Keycloak account page, the browser automatically includes an Authorization Bearer token in all requests.

### Steps:

1. **Open Browser Developer Tools** (F12)
2. **Go to Network tab**
3. **Navigate to Keycloak account page** (while logged in)
4. **Find any request** (e.g., `/account/applications`, `/account/credentials`)
5. **Click on the request** → **Headers tab**
6. **Look for `authorization` header** in Request Headers
7. **Copy the token** (the part after `Bearer `)

### Token Format:

```
authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJDdjhRQVpEa3pYTlVvSXdNTnpZQWxBSmlBWlUtbmlvelV4VG96R0I4eXM0In0...
```

**Extract only the token part** (everything after `Bearer `)

## Token Expiration

⚠️ **Important:** This token has an expiration time (`exp` field in JWT).

From your token:
- **Expires:** `1766990816` (Unix timestamp)
- **Issued:** `1766989016`
- **Valid for:** ~30 minutes (1800 seconds)

You'll need to:
1. **Refresh the token** when it expires
2. **Get a new token** from the browser network tab
3. **Or use the token endpoint** to get a fresh token programmatically

## Using the Token

Once extracted, use it in deployment:

```bash
curl -X POST "https://participant.dev.canton.wolfedgelabs.com/v2/packages" \
  -H "Content-Type: application/octet-stream" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --data-binary "@.daml/dist/prediction-markets-test-1.0.0.dar"
```

## Alternative: Extract from Browser Console

You can also extract the token using browser console:

1. Open Console tab (F12)
2. Run:
   ```javascript
   // Get token from cookies
   document.cookie.split(';').find(c => c.includes('KEYCLOAK'))
   
   // Or check localStorage/sessionStorage
   localStorage.getItem('keycloak-token')
   sessionStorage.getItem('keycloak-token')
   ```

However, the Network tab method is most reliable.

