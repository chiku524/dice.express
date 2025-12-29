# Deployment Issue - Client Communication

## Status Update

We've updated the deployment scripts to use the correct endpoint `/v2/dars` as you confirmed. However, we're still encountering a 403 Forbidden error with the message "invalid token".

## What We've Verified

✅ **Endpoint**: Using `/v2/dars` (confirmed correct)  
✅ **Token Generation**: Successfully obtaining tokens from Keycloak  
✅ **Token Format**: Valid JWT format (starts with `eyJ...`)  
✅ **Client ID**: Using `Prediction-Market`  
✅ **Token Scope**: Includes `daml_ledger_api`  
✅ **Token Audience**: Includes `https://canton.network.global`  

## Error Details

**HTTP Status**: 403 Forbidden  
**Error Message**: 
```json
{
  "code": "NA",
  "cause": "A security-sensitive error has been received",
  "context": {
    "ledger_api_error": "invalid token"
  }
}
```

**Request Details**:
- Endpoint: `POST https://participant.dev.canton.wolfedgelabs.com/v2/dars`
- Content-Type: `application/octet-stream`
- Authorization: `Bearer <token>` (valid JWT)
- DAR File: `prediction-markets-test-1.0.0.dar` (529,133 bytes)

## Token Information

The token we're receiving includes:
- **Client**: `Prediction-Market`
- **User**: `nico` (nico.builds@outlook.com)
- **Scope**: `profile daml_ledger_api email`
- **Audience**: `https://canton.network.global`, `account`
- **Token Type**: Bearer JWT
- **Expires**: 1800 seconds (30 minutes)

## Questions for Client

1. **Token Validation**: Is there something specific Canton is checking in the token that we might be missing? The token appears valid but Canton is rejecting it.

2. **Permissions**: Does the user account (`nico`) have the required `package:upload` or DAR upload permissions? Should we verify this in Keycloak?

3. **Client Configuration**: Is the `Prediction-Market` client configured correctly for DAR uploads? Are there any additional scopes or claims required?

4. **Token Format**: Are there any specific token claims or headers required beyond what we're currently sending?

5. **Alternative Methods**: Is there an alternative way to upload DARs, or should we use a different authentication method?

## What We've Tried

1. ✅ Updated to correct endpoint `/v2/dars`
2. ✅ Verified token generation and format
3. ✅ Confirmed token includes `daml_ledger_api` scope
4. ✅ Verified token audience includes `https://canton.network.global`
5. ❌ Still receiving "invalid token" error

## Next Steps

We're ready to proceed once we understand what's causing the token validation to fail. Any guidance on:
- Required token claims
- User permissions needed
- Client configuration
- Alternative authentication methods

Would be greatly appreciated.

