# Token Authentication Issue

## Problem

The Canton JSON API is rejecting valid authentication tokens with a 403 "invalid token" error.

## Token Verification Results

✅ **Token is Valid:**
- Format: Valid JWT (3 parts)
- Expiration: Valid for ~28 minutes
- Scopes: `profile daml_ledger_api email` ✅
- Issuer: `https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet`
- Client ID: `Prediction-Market`

## Test Results

All authentication header formats tested return **403 Forbidden**:

| Test | Format | Result |
|------|--------|--------|
| 1 | `Bearer <token>` (standard) | ❌ 403 "invalid token" |
| 2 | `Bearer  <token>` (extra space) | ❌ 403 "invalid token" |
| 3 | `<token>` (no Bearer) | ❌ 401 Unauthorized |
| 4 | `bearer <token>` (lowercase) | ❌ 403 "invalid token" |
| 5 | No auth | ❌ 401 Unauthorized |

## Observations

1. **Endpoint requires authentication** (401 without token)
2. **Token format is recognized** (401 vs 403 difference shows token is being parsed)
3. **Token is being rejected** (403 means token validation failed)

## Possible Causes

### 1. Token Audience Mismatch
The token might have an audience that doesn't match what Canton expects for JSON API.

**Token Audience:** Check with `node scripts/verify-token.js`

**Expected:** Canton might expect:
- `https://canton.network.global` (from token payload)
- Or a specific JSON API audience

### 2. Different Token Requirements for JSON API vs gRPC
- ✅ **gRPC Admin API** works with this token (deployment succeeded)
- ❌ **JSON API** rejects the same token

This suggests JSON API might have different authentication requirements.

### 3. Missing Claims or Roles
The token might need additional claims or roles that aren't present.

### 4. Token Validation Configuration
Canton's JSON API might be configured to validate tokens differently than the gRPC API.

## Next Steps

### Immediate Actions

1. **Check Token Audience:**
   ```bash
   node scripts/verify-token.js
   ```
   Look for the `aud` (audience) claim and verify it matches Canton's expectations.

2. **Contact Client:**
   - Ask about JSON API authentication requirements
   - Verify if JSON API uses different token validation than gRPC
   - Check if there's a specific audience or claim required

3. **Check Canton Documentation:**
   - Look for JSON API authentication requirements
   - Verify if there's a different token endpoint or format needed

### Questions for Client

1. Does the JSON API require a different token than gRPC?
2. What audience should the token have for JSON API?
3. Are there additional claims or roles required?
4. Is the JSON API authentication configured differently?
5. Can you provide an example of a successful JSON API request with authentication?

## Workaround

Since gRPC Admin API works, we can:
- Use gRPC for deployments ✅ (already working)
- For contract creation, we may need to:
  - Use a different authentication method
  - Get a different token type
  - Wait for client to fix/configure JSON API authentication

## Related Files

- `scripts/verify-token.js` - Token verification
- `scripts/test-token-auth.js` - Authentication format testing
- `scripts/setup-via-json-api.js` - JSON API setup script
- `docs/TOKEN_AUTHENTICATION_ISSUE.md` - This document

## Status

🔴 **Blocked** - Waiting on client clarification or configuration fix.

