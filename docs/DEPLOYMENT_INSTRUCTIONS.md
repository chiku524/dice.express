# Deployment Instructions

## Quick Deployment

To deploy the DAR file to Canton devnet, you have two options:

### Option 1: Using PowerShell with Credentials (Recommended)

Run the deployment script with your credentials:

```powershell
.\scripts\deploy-with-credentials.ps1 -Username "your-username" -Password "your-password"
```

This script will:
1. Authenticate with Keycloak using Client ID "Prediction-Market"
2. Upload the DAR file via gRPC Admin API
3. Confirm successful deployment

### Option 2: Interactive Deployment

Run the original script (it will prompt for credentials):

```powershell
.\scripts\deploy-via-grpc-admin.ps1
```

When prompted:
- **Username**: Your Keycloak username
- **Password**: Your Keycloak password
- **Client ID**: Use "Prediction-Market" (or press Enter if it defaults correctly)

## What Gets Deployed

- **DAR File**: `.daml/dist/prediction-markets-1.0.0.dar` (554 KB)
- **Templates**: Token, Market, Position, AMM, SettlementRequest, Allocation
- **API**: Token Standard API (not deprecated DA.Finance)

## Post-Deployment

After successful deployment:

1. **Verify Package Upload**: Check that the package appears on the ledger
2. **Test Contract Creation**: Create a test MarketConfig contract
3. **Test Frontend**: Try creating a market from the frontend

## Troubleshooting

### Authentication Errors
- Verify your Keycloak username and password are correct
- Ensure Client ID is "Prediction-Market"
- Check that your account has the necessary permissions

### Network Errors
- Verify connectivity to `participant.dev.canton.wolfedgelabs.com`
- Check firewall settings
- Ensure port 443 is accessible

### gRPC Errors
- Verify grpcurl is installed: `grpcurl --version`
- Check that the DAR file exists at the specified path
- Verify the service endpoint is correct

