# Deployment Token Issue

## Status

✅ **Token Successfully Extracted** from browser network tab  
❌ **Deployment Still Returns 401 Unauthorized**

## Analysis

### Token Details
- **Client:** `account-console` (from `azp` field in JWT)
- **Audience:** `account` (from `aud` field)
- **Scopes:** `openid profile email` (from `scope` field)
- **Roles:** `manage-account`, `manage-account-links` (account management only)

### The Problem

The token extracted from the browser is for the **Keycloak account console**, not for the **Canton API**. 

The token has:
- ✅ Valid authentication
- ✅ Correct user identity
- ❌ Wrong client (`account-console` instead of Canton API client)
- ❌ Wrong audience (`account` instead of Canton participant)
- ❌ Wrong scopes (account management, not API access)

## Solution

You need a token with:
1. **Correct Client ID** - The Canton API client (not `account-console`)
2. **Correct Audience** - The Canton participant
3. **Correct Scopes** - API access permissions

### Option 1: Get Token from Canton API Client

The devnet administrator should provide:
- **Client ID** for Canton API access
- **Client Secret** (if required)
- **Token endpoint** or instructions

Then use the token endpoint:
```bash
curl -X POST "https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=CANTON_API_CLIENT_ID" \
  -d "client_secret=CANTON_API_CLIENT_SECRET" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD"
```

### Option 2: Check for Different Token in Network Tab

Look for requests to:
- `participant.dev.canton.wolfedgelabs.com` (not Keycloak)
- These might have a different token with correct scopes

### Option 3: Contact Devnet Administrator

Ask for:
1. **Client ID** for API access
2. **Authentication method** (password grant, client credentials, etc.)
3. **Required scopes** for package deployment
4. **Example token request** or documentation

## Next Steps

1. **Contact the devnet administrator** to get the correct Client ID
2. **Request API access credentials** (Client ID/Secret)
3. **Get a token** using the correct client
4. **Retry deployment** with the new token

## Current Token (For Reference)

The extracted token is valid for account management but not for API access. Keep the extraction method documented for future use once you have the correct client credentials.

