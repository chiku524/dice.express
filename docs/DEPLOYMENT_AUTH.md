# Canton Deployment Authentication

## Test Contract Deployment Result

✅ **Build Successful:**
- Test contract compiled and built DAR file
- DAR file size: ~516 KB
- Ready for deployment

❌ **Deployment Failed:**
- HTTP 401 Unauthorized
- Canton participant requires authentication

## Error Details

```
POST /v2/packages
HTTP/1.1 401 Unauthorized

{
  "code": "NA",
  "cause": "A security-sensitive error has been received",
  "correlationId": "77f6a393b3f893a7707ea601504a3f5f",
  ...
}
```

## Authentication Required

The Canton devnet participant requires authentication to upload packages. You need to:

1. **Get an authentication token** from the Canton devnet provider
2. **Include the token** in the deployment request

## Deployment Options

### Option 1: Using curl with Bearer Token

```bash
curl -X POST "https://participant.dev.canton.wolfedgelabs.com/v2/packages" \
  -H "Content-Type: application/octet-stream" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --data-binary "@.daml/dist/prediction-markets-test-1.0.0.dar"
```

### Option 2: Using daml deploy (if available)

```bash
daml deploy --host participant.dev.canton.wolfedgelabs.com \
  --port 443 \
  --token YOUR_TOKEN \
  .daml/dist/prediction-markets-test-1.0.0.dar
```

### Option 3: Check Canton Documentation

The devnet provider should have documentation on:
- How to obtain an access token
- Authentication method (Bearer token, API key, etc.)
- Required headers or parameters

## Keycloak Authentication

The Canton devnet uses **Keycloak** for authentication. You have an account at:
https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/account/

**The account page doesn't show token generation directly.** You need to use the Keycloak token endpoint.

### Getting a Token

See: **`docs/KEYCLOAK_AUTH_TOKEN.md`** for detailed instructions.

Quick method:
1. Use the Keycloak token endpoint:
   ```
   https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token
   ```
2. Request token with your credentials (see guide for details)
3. Extract `access_token` from the response

Or use the helper script:
```bash
scripts\get-keycloak-token.bat
```

## Next Steps

1. **Get Client ID** from devnet administrator (if required)
2. **Get access token** using Keycloak token endpoint (see `docs/KEYCLOAK_AUTH_TOKEN.md`)
3. **Deploy test contract** using the token

2. **Verify local testing** works:
   ```bash
   # Start local ledger
   daml start
   
   # Run test script
   dpm run daml/TestScript.daml
   ```

3. **Once authenticated**, deploy test contract to verify:
   - Devnet access works
   - Package upload succeeds
   - Contracts can be created on-chain

## Summary

✅ **SDK and build process verified** - Test contract builds successfully
✅ **DAML code compiles** - No syntax or type errors
⏳ **Deployment pending** - Requires authentication token from client

The test contract proves the development environment is working correctly. The remaining issue is obtaining proper authentication for the Canton devnet.

