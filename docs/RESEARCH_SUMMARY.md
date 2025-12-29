# Canton Research Summary

## Research Completed

Comprehensive research on Canton JSON API, contract creation, queries, and deployment.

## Key Findings

### 1. Token Lifetime Issue ⚠️ **CRITICAL**

**Finding**: Canton may reject tokens with lifetime **exceeding 5 minutes by default**.

**Impact**: Our tokens are valid for 30 minutes, which may exceed Canton's default limit.

**Evidence**:
- Canton documentation states: "Tokens with a lifetime exceeding 5 minutes are typically not accepted by default"
- Recent Canton updates have tightened security configurations
- Token lifetime limits may have been reduced

**Solution**:
1. Test with a **fresh token** (use immediately after creation)
2. Request tokens with shorter lifetime if possible
3. Contact client about token lifetime configuration

**Test Script**: `scripts/test-fresh-token.ps1`

### 2. Endpoint Configuration ✅

**Confirmed Endpoints**:
- **JSON API**: `https://participant.dev.canton.wolfedgelabs.com/json-api`
- **Admin API (gRPC)**: `participant.dev.canton.wolfedgelabs.com:443` or `participant.dev.canton.wolfedgelabs.com/admin-api`

**Status**: All scripts are using correct endpoints ✅

### 3. JSON API Request Format

**v2 Format** (Recommended):
```json
{
  "actAs": ["Party"],
  "commandId": "unique-id",
  "applicationId": "prediction-markets",
  "commands": [
    {
      "CreateCommand": {
        "templateId": "Module:Template",
        "createArguments": { ... }
      }
    }
  ]
}
```

**Key Points**:
- `actAs` is an array of parties
- `commandId` must be unique
- `applicationId` is required
- `commands` is an array of command objects

### 4. Authentication Best Practices

1. **Use Fresh Tokens**: Request and use immediately
2. **Enable TLS**: Always use HTTPS
3. **Manage Token Lifecycle**: Refresh before expiration
4. **Verify Token**: Check format, expiration, scopes, audience

### 5. Security Requirements

- **TLS**: Must be enabled on APIs receiving tokens
- **Token Storage**: Store tokens securely in memory
- **Token Lifetime**: Keep under 5 minutes if possible
- **Mutual TLS**: Recommended for Admin API

## Documentation Created

1. **CANTON_ENDPOINTS_UPDATE.md** - Updated endpoint paths
2. **CANTON_RESEARCH_FINDINGS.md** - Detailed research findings
3. **TOKEN_LIFETIME_ISSUE.md** - Token lifetime analysis
4. **CANTON_JSON_API_GUIDE.md** - Complete JSON API guide
5. **RESEARCH_SUMMARY.md** - This document

## Tools Created

1. **test-fresh-token.ps1** - Test with immediately-created token
2. **verify-token.js** - Token verification tool
3. **test-token-auth.js** - Authentication format testing

## Next Steps

### Immediate Actions

1. **Test with Fresh Token**:
   ```powershell
   .\scripts\test-fresh-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"
   ```
   This will help determine if token lifetime is the issue.

2. **If Fresh Token Works**:
   - Implement token refresh strategy
   - Request shorter-lived tokens
   - Use tokens immediately after creation

3. **If Fresh Token Still Fails**:
   - Contact client about token lifetime configuration
   - Verify token audience matches Canton's expectations
   - Check if additional claims or roles are required

### Questions for Client

1. **Token Lifetime**:
   - What is the maximum token lifetime accepted by Canton?
   - Can the limit be increased to 30 minutes?
   - Or should we request tokens with shorter lifetime?

2. **Token Audience**:
   - What audience should the token have for JSON API?
   - Is it different from gRPC Admin API?

3. **Token Validation**:
   - Is JSON API token validation configured differently than gRPC?
   - Are there additional requirements for JSON API tokens?

## Current Status

✅ **Endpoints**: Correctly configured
✅ **Token Format**: Valid JWT with correct scopes
✅ **Request Format**: Matches Canton's expected format
❓ **Token Lifetime**: May exceed 5-minute default limit
❓ **Token Validation**: May have different requirements for JSON API

## Testing Strategy

1. **Test with Fresh Token** (highest priority)
   - Use `test-fresh-token.ps1`
   - If works → token lifetime is the issue
   - If fails → other configuration issue

2. **Verify Token Details**
   - Use `verify-token.js`
   - Check expiration, scopes, audience

3. **Test Authentication Formats**
   - Use `test-token-auth.js`
   - Verify header format

## Resources

- **Canton Documentation**: https://docs.digitalasset.com
- **Canton Security**: https://docs.digitalasset.com/overview/3.3/explanations/canton/security.html
- **Canton Quickstart**: https://github.com/digital-asset/cn-quickstart
- **Secure Infrastructure**: https://github.com/digital-asset/ex-secure-canton-infra

