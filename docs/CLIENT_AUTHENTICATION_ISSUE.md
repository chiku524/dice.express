# JSON API Authentication Issue - Client Summary

## Problem Summary

We are receiving **403 "invalid token"** errors when attempting to use the Canton JSON API, even though:
- ✅ The token is valid (not expired, correct format)
- ✅ The token has required scopes (`daml_ledger_api`, `profile`, `email`)
- ✅ The token has correct audience (`https://canton.network.global`, `account`)
- ✅ The token works for **gRPC Admin API** (deployment succeeded)
- ✅ The token was used **immediately** after creation (1.67 seconds old)

## Test Results

### Token Verification ✅
- **Format**: Valid JWT (3 parts)
- **Lifetime**: 30 minutes
- **Scopes**: `profile daml_ledger_api email`
- **Audience**: `https://canton.network.global, account`
- **Issuer**: `https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet`
- **Client ID**: `Prediction-Market`

### Test with Fresh Token ❌
- **Token Age**: 1.67 seconds (well under 5-minute limit)
- **Result**: Still receiving 403 "invalid token"
- **Conclusion**: Token lifetime is NOT the issue

## What Works ✅

1. **gRPC Admin API**: Token works perfectly
   - Endpoint: `participant.dev.canton.wolfedgelabs.com:443`
   - Service: `com.digitalasset.canton.admin.participant.v30.PackageService/UploadDar`
   - Status: ✅ DAR file deployment successful

2. **Token Generation**: Working correctly
   - Keycloak authentication: ✅
   - Token format: ✅
   - Token scopes: ✅

## What Doesn't Work ❌

1. **JSON API**: Token rejected with 403
   - Endpoint: `https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait`
   - Error: `403 Forbidden - "invalid token"`
   - Status: ❌ All requests fail

## Analysis

Since the same token:
- ✅ Works for gRPC Admin API
- ❌ Fails for JSON API
- ✅ Is valid and not expired
- ✅ Has correct scopes and audience
- ✅ Was used immediately (1.67 seconds old)

The issue is likely:

### 1. Different Token Requirements for JSON API
JSON API might require:
- Different token audience
- Additional claims or roles
- Different client ID
- Different scopes

### 2. Token Validation Configuration
Canton's JSON API might be configured to:
- Validate tokens differently than gRPC
- Require different token source
- Have different authentication rules

### 3. Missing Configuration
JSON API authentication might not be:
- Properly configured
- Enabled
- Set up to accept tokens from Keycloak

## Questions

1. **Token Audience**:
   - What audience should the token have for JSON API?
   - Is it different from gRPC Admin API?
   - Should it be `https://canton.network.global` or something else?

2. **Token Requirements**:
   - Are there different token requirements for JSON API vs gRPC?
   - Do we need additional claims or roles?
   - Should we use a different client ID?

3. **Configuration**:
   - Is JSON API authentication properly configured?
   - Is it set up to accept tokens from Keycloak?
   - Are there specific validation rules for JSON API?

4. **Example Request**:
   - Can you provide an example of a successful JSON API request?
   - What token format/audience was used?
   - What headers are required?

## Request Format We're Using

```json
{
  "actAs": ["Admin"],
  "commandId": "unique-command-id",
  "applicationId": "prediction-markets",
  "commands": [
    {
      "CreateCommand": {
        "templateId": "Token:TokenBalance",
        "createArguments": {
          "owner": "Admin",
          "token": {
            "id": "USDC",
            "symbol": "USDC",
            "name": "USD Coin",
            "decimals": 6,
            "description": "Stablecoin"
          },
          "amount": 1000.0
        }
      }
    }
  ]
}
```

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

**Endpoint**: `https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait`

## Current Status

🔴 **Blocked** - Cannot create contracts via JSON API due to authentication issue.

**Working**:
- ✅ DAR file deployment via gRPC
- ✅ Token generation
- ✅ Token validation

**Not Working**:
- ❌ Contract creation via JSON API
- ❌ Market creation via frontend (uses JSON API)
- ❌ Contract queries via JSON API

## Next Steps

1. **Client Response**: Please clarify token requirements for JSON API
2. **Configuration Check**: Verify JSON API authentication is properly configured
3. **Testing**: Once we have the correct token format, we can test again

## Files for Reference

- `docs/FRESH_TOKEN_TEST_RESULTS.md` - Detailed test results
- `docs/TOKEN_AUTHENTICATION_ISSUE.md` - Technical analysis
- `scripts/verify-token.js` - Token verification tool
- `scripts/test-fresh-token.ps1` - Fresh token test script

