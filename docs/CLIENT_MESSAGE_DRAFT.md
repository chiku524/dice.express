# Message Draft for Client

---

Hi Huzefa,

I've updated the deployment scripts to use the `/v2/dars` endpoint as you confirmed. However, I'm still encountering an issue with the deployment.

## Current Status

✅ **Using correct endpoint**: `/v2/dars`  
✅ **Token generation**: Successfully obtaining tokens from Keycloak  
✅ **Token format**: Valid JWT with correct client ID (`Prediction-Market`)  
✅ **Token scope**: Includes `daml_ledger_api`  
✅ **Token audience**: Includes `https://canton.network.global`  

## Error Encountered

When attempting to deploy, I'm receiving:

**HTTP Status**: 403 Forbidden  
**Error Response**:
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

The token being generated includes:
- **Client ID**: `Prediction-Market`
- **User**: `nico` (nico.builds@outlook.com)
- **Scope**: `profile daml_ledger_api email`
- **Audience**: `https://canton.network.global`, `account`
- **Token Type**: Bearer JWT
- **Expires**: 1800 seconds (30 minutes)

## Questions

1. **Token Validation**: Is there something specific Canton is checking in the token that might be missing? The token appears valid but Canton is rejecting it with "invalid token".

2. **User Permissions**: Does the user account (`nico`) have the required permissions for DAR uploads? Should I verify this in Keycloak or is there a specific role needed?

3. **Client Configuration**: Is the `Prediction-Market` client configured correctly for DAR uploads? Are there any additional scopes or claims required beyond `daml_ledger_api`?

4. **Alternative Methods**: Is there an alternative way to upload DARs, or should I use a different authentication method?

I'm ready to proceed once I understand what's causing the token validation to fail. Any guidance would be greatly appreciated.

Thanks!

---

