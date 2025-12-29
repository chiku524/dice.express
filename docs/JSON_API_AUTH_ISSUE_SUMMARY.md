# JSON API Authentication Issue - Summary

## Status: 🔴 Blocked - Requires Client Support

## Problem

The Canton JSON API endpoint `/v2/commands/submit-and-wait` is rejecting valid authentication tokens with **403 Forbidden: "invalid token"**.

## Key Findings

### ✅ Token is Valid
- **Format**: Valid JWT (3 parts)
- **Expiration**: Valid for ~25 minutes
- **Scopes**: `profile daml_ledger_api email` ✅
- **Audience**: `https://canton.network.global, account` ✅
- **Issuer**: `https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet`
- **Client ID**: `Prediction-Market`

### ✅ Token Works for gRPC
- **gRPC Admin API** accepts the same token ✅
- DAR file deployment via gRPC works successfully
- This confirms the token itself is valid

### ❌ Token Rejected for JSON API
- **JSON API** rejects the same token ❌
- All authentication header formats tested return 403
- Error: `"ledger_api_error": "invalid token"`

## Test Results

All authentication formats tested:

| Format | Result |
|--------|--------|
| `Bearer <token>` (standard) | ❌ 403 "invalid token" |
| `Bearer  <token>` (extra space) | ❌ 403 "invalid token" |
| `<token>` (no Bearer) | ❌ 401 Unauthorized |
| `bearer <token>` (lowercase) | ❌ 403 "invalid token" |
| No auth | ❌ 401 Unauthorized |

## Analysis

The fact that:
1. Token works for gRPC ✅
2. Token is rejected for JSON API ❌
3. All header formats return the same 403 error

Suggests that **JSON API has different authentication requirements** than gRPC, or there's a **configuration issue** on Canton's side.

## What We've Tried

1. ✅ Verified token format and validity
2. ✅ Checked token expiration and scopes
3. ✅ Verified token audience
4. ✅ Tested multiple authentication header formats
5. ✅ Confirmed token works for gRPC Admin API
6. ✅ Created comprehensive testing tools

## Questions for Client

1. **Does JSON API require different authentication than gRPC?**
   - The same token works for gRPC but not JSON API

2. **Is there a different token endpoint or client ID for JSON API?**
   - Currently using `Prediction-Market` client ID

3. **What audience should the token have for JSON API?**
   - Current token has: `https://canton.network.global, account`

4. **Are there additional claims or roles required?**
   - Current scopes: `profile daml_ledger_api email`

5. **Is JSON API authentication configured correctly on Canton?**
   - The endpoint exists (returns 401/403, not 404)
   - But token validation is failing

6. **Can you provide an example of a successful JSON API request?**
   - Including the exact token format and headers used

## Impact

**Blocked Operations:**
- ❌ Contract creation via JSON API
- ❌ Market creation via frontend (uses JSON API)
- ❌ Contract queries via JSON API

**Working Operations:**
- ✅ DAR file deployment via gRPC
- ✅ Token generation and validation

## Workarounds

Until this is resolved, we can:
1. Use gRPC for deployments (already working)
2. Wait for client to fix/configure JSON API authentication
3. Potentially use a different authentication method if available

## Files Created

- `scripts/verify-token.js` - Token verification tool
- `scripts/test-token-auth.js` - Authentication format testing
- `docs/TOKEN_AUTHENTICATION_ISSUE.md` - Detailed issue documentation
- `docs/JSON_API_AUTH_ISSUE_SUMMARY.md` - This summary

## Next Steps

1. **Contact client** with this summary
2. **Request clarification** on JSON API authentication requirements
3. **Wait for resolution** or alternative authentication method
4. **Test again** once client provides guidance or fixes configuration

## Technical Details

**Endpoint:** `https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait`

**Request Format:**
```json
{
  "actAs": ["Admin"],
  "commandId": "test-command",
  "applicationId": "prediction-markets",
  "commands": [
    {
      "CreateCommand": {
        "templateId": "Token:TokenBalance",
        "createArguments": { ... }
      }
    }
  ]
}
```

**Headers:**
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

**Response:**
```json
{
  "code": "NA",
  "cause": "A security-sensitive error has been received",
  "context": {
    "ledger_api_error": "invalid token"
  }
}
```

