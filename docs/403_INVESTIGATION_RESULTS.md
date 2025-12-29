# 403 Authentication Investigation Results

## Deep Investigation Summary

### Test Results

All authentication methods tested return **403 "invalid token"**:

1. ✅ **Standard Bearer token** → 403
2. ✅ **Bearer + X-Auth-Token header** → 403
3. ✅ **X-Auth-Token header only** → 403
4. ✅ **No authentication** → 401 (confirms auth is required)

### Error Response

```json
{
  "code": "NA",
  "cause": "A security-sensitive error has been received",
  "context": {
    "ledger_api_error": "invalid token"
  },
  "grpcCodeValue": 7
}
```

### Token Analysis

**Token is Valid:**
- ✅ Format: Valid JWT (3 parts)
- ✅ Issuer: `https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet`
- ✅ Audience: `["https://canton.network.global", "account"]`
- ✅ Scopes: `profile daml_ledger_api email`
- ✅ Client ID: `Prediction-Market`
- ✅ Realm roles: `default-roles-canton-devnet`, `offline_access`, `uma_authorization`
- ✅ Resource access: `account` with roles `manage-account`, `manage-account-links`, `view-profile`

**Token Works For:**
- ✅ gRPC Admin API (deployment successful)

**Token Fails For:**
- ❌ JSON API (all endpoints return 403)

## Root Cause Analysis

### Conclusion

The issue is **NOT** with:
- ❌ Token format (valid JWT)
- ❌ Token lifetime (works even when used immediately)
- ❌ Token scopes (has `daml_ledger_api`)
- ❌ Token audience (has `https://canton.network.global`)
- ❌ Request format (correct v2 format)
- ❌ Header format (standard Bearer token)

### Likely Cause

**Canton's JSON API is not configured to accept tokens from Keycloak**, or requires:
1. Different token audience for JSON API
2. Different token issuer validation
3. Additional claims or roles
4. Different authentication configuration

### Evidence

1. Same token works for gRPC Admin API ✅
2. Same token fails for JSON API ❌
3. All authentication formats fail (not a format issue)
4. Error is consistent: "invalid token" (validation failure)

## Resolution

This requires **client-side configuration** on Canton:

1. **Configure JSON API authentication** to accept Keycloak tokens
2. **Verify token audience** matches JSON API expectations
3. **Check token validation rules** for JSON API vs gRPC
4. **Provide example** of successful JSON API request with authentication

## Next Steps

1. ✅ **Investigation complete** - Issue identified
2. ⏭️ **Contact client** with findings
3. ⏭️ **Wait for configuration fix** or clarification
4. ⏭️ **Test again** once client provides solution

## Files Created

- `scripts/test-json-api-auth.js` - Deep authentication investigation script
- `docs/403_INVESTIGATION_RESULTS.md` - This document

