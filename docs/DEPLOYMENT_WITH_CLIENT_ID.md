# Deployment with Client ID

## Client ID Provided

✅ **Client ID:** `Prediction-Market`

## Getting Token

Use the Keycloak token endpoint with the provided Client ID:

```bash
curl -X POST "https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=Prediction-Market" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD"
```

## Automated Script

Use the provided script:

```bash
scripts\get-token-and-deploy.bat
```

This script will:
1. Prompt for your Keycloak username and password
2. Request a token using Client ID "Prediction-Market"
3. Extract the access token
4. Deploy the test contract to Canton

## Manual Steps

If you prefer to do it manually:

### Step 1: Get Token

```bash
curl -X POST "https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=Prediction-Market" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD" \
  -o token-response.json
```

### Step 2: Extract Token

```powershell
# Using PowerShell
(Get-Content token-response.json | ConvertFrom-Json).access_token
```

Or manually copy from the JSON response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 300,
  ...
}
```

### Step 3: Deploy

```bash
curl -X POST "https://participant.dev.canton.wolfedgelabs.com/v2/dars" \
  -H "Content-Type: application/octet-stream" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --data-binary "@test-contract\.daml\dist\prediction-markets-test-1.0.0.dar"
```

**Note:** The correct endpoint is `/v2/dars` (not `/v2/packages`), as confirmed by the client.

## Expected Response

### Success (200 OK)
- Package uploaded successfully
- You can now create contracts on-chain

### Error (401 Unauthorized)
- Token may be expired
- Client ID may be incorrect
- User may not have required permissions
- Try getting a fresh token

### Error (400 Bad Request)
- DAR file may be invalid
- Package may already exist
- Check the error message for details

## Next Steps After Successful Deployment

1. **Verify deployment** by querying for contracts
2. **Create a test contract** using the deployed template
3. **Test the contract** by exercising choices
4. **Deploy main project** once DA.Finance packages are resolved

