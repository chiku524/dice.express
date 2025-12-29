# Token 403 Forbidden Issue

## Status

✅ **Token Successfully Obtained:**
- Client ID: `Prediction-Market` ✓
- Token format: Valid JWT ✓
- Scope: `profile daml_ledger_api email` ✓
- Audience: `https://canton.network.global` and `account` ✓

❌ **Deployment Still Returns 403 Forbidden:**
- Error: `"ledger_api_error":"invalid token"`
- HTTP Status: 403

## Token Details

From `token.json`:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 1800,
  "token_type": "Bearer",
  "scope": "profile daml_ledger_api email"
}
```

Token includes:
- ✅ Correct client: `Prediction-Market`
- ✅ Correct scope: `daml_ledger_api`
- ✅ Correct audience: `https://canton.network.global`
- ✅ Valid JWT format

## Possible Causes

### 1. Token Validation Timing
- Token might need to be used immediately after generation
- There might be a clock skew issue
- Token might be validated against a different endpoint

### 2. Missing Permissions
- User might not have `package:upload` permission
- Client might need additional roles/scopes
- Token might need resource-specific permissions

### 3. Endpoint-Specific Validation
- ✅ **CORRECT ENDPOINT**: `/v2/dars` (confirmed by client)
- ❌ `/v2/packages` was incorrect (returns 404)
- Might need additional headers

### 4. Token Audience Mismatch
- Canton participant might expect a different audience
- Token might need to be validated against participant-specific endpoint

## Next Steps

### Option 1: Contact Devnet Administrator

Ask about:
1. **Token validation requirements** - What does Canton check?
2. **Required permissions** - Does user need specific roles?
3. ✅ **Endpoint confirmed**: `/v2/dars` (client confirmed)
4. **Token format** - Are there additional claims needed?

### Option 2: Use Correct Endpoint

✅ **CORRECT ENDPOINT** (confirmed by client):
```bash
curl -X POST "https://participant.dev.canton.wolfedgelabs.com/v2/dars" \
  -H "Content-Type: application/octet-stream" \
  -H "Authorization: Bearer TOKEN" \
  --data-binary "@test-contract\.daml\dist\prediction-markets-test-1.0.0.dar"
```

### Option 3: Check Token Immediately After Generation

The token might need to be used right away. Try:
1. Get token
2. Immediately deploy (within seconds)
3. Check if timing matters

## Current Token (For Reference)

Token expires at: `1766992409` (Unix timestamp)
- Valid for: 1800 seconds (30 minutes)
- Generated at: `1766990609`

## Summary

The token appears correct but Canton is rejecting it. This suggests:
- **Configuration issue** on Canton side
- **Permission issue** - user/client might need additional permissions
- **Validation issue** - Canton might be checking something we're not aware of

**Update:** Client confirmed the correct endpoint is `/v2/dars`. All deployment scripts have been updated to use this endpoint.

**Recommendation:** Try deployment again with `/v2/dars` endpoint. If 403 persists, contact the devnet administrator to verify:
1. Token format is correct
2. User has required permissions (`package:upload`)
3. Client ID has correct configuration

