# Getting Authentication Token from Keycloak

## Overview

The Canton devnet uses Keycloak for authentication. You need to obtain an access token from Keycloak to authenticate API requests.

## Keycloak Account Page

You're signed in at: https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/account/

**Note:** The account management page typically doesn't show token generation directly. You need to use the Keycloak token endpoint.

## Method 1: Using Keycloak Token Endpoint (Recommended)

Keycloak provides a token endpoint that you can use to get an access token. Here's how:

### Step 1: Get Your Client Credentials

You'll need:
- **Client ID** (usually provided by the devnet administrator)
- **Client Secret** (if using confidential client)
- **Username** and **Password** (your Keycloak account credentials)

### Step 2: Request Token via Token Endpoint

The Keycloak token endpoint is typically:
```
https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token
```

#### Option A: Using Username/Password (Resource Owner Password Credentials)

```bash
curl -X POST "https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD"
```

#### Option B: Using Client Credentials (if available)

```bash
curl -X POST "https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

### Step 3: Extract Access Token

The response will look like:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "refresh_token": "...",
  "token_type": "Bearer",
  "not-before-policy": 0,
  "session_state": "...",
  "scope": "profile email"
}
```

Extract the `access_token` value.

## Method 2: Using Browser Developer Tools

1. Open your browser's Developer Tools (F12)
2. Go to the Network tab
3. Navigate to the Keycloak account page while logged in
4. Look for requests to `/protocol/openid-connect/token` or check cookies for tokens
5. You might find tokens in:
   - Cookies (look for `access_token` or similar)
   - Local Storage
   - Session Storage

## Method 3: Check Canton/Keycloak Documentation

The devnet provider may have specific documentation:
- Check for a "Getting Started" guide
- Look for API documentation
- Check for a developer portal or dashboard

## Using the Token

Once you have the token, use it in API requests:

```bash
curl -X POST "https://participant.dev.canton.wolfedgelabs.com/v2/packages" \
  -H "Content-Type: application/octet-stream" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  --data-binary "@.daml/dist/prediction-markets-test-1.0.0.dar"
```

## Script to Get Token

I've created a helper script to get the token. You'll need to provide:
- Your Keycloak username
- Your Keycloak password  
- Client ID (may need to ask devnet administrator)

See: `scripts/get-keycloak-token.bat`

## Next Steps

1. **Contact the devnet administrator** to get:
   - Client ID for API access
   - Client Secret (if required)
   - Confirmation of which grant type to use

2. **Try the token endpoint** with your credentials

3. **Test the token** by deploying the test contract

## References

- [Keycloak Token Endpoint Documentation](https://www.keycloak.org/docs/latest/securing_apps/#_token_endpoint)
- [OAuth2 Resource Owner Password Credentials](https://oauth.net/2/grant-types/password/)
- [OAuth2 Client Credentials](https://oauth.net/2/grant-types/client-credentials/)

