# Deployment Instructions: Build and Deploy to Canton

## Quick Start

To build and deploy the DAML contracts to Canton (enabling market creation on-chain), run one of these scripts **in a terminal where `daml` command works**:

### Option 1: PowerShell Script (Recommended)
```powershell
.\scripts\build-and-deploy-to-canton.ps1
```

### Option 2: Batch Script
```cmd
.\scripts\build-and-deploy-to-canton.bat
```

## What These Scripts Do

1. **Check DAML SDK**: Verifies DAML SDK is installed and correct version
2. **Build Project**: Compiles DAML contracts into a DAR file
3. **Upload to Canton**: Deploys the DAR file to the Canton participant node

## Prerequisites

- ✅ DAML SDK 2.10.2 installed (`daml install 2.10.2`)
- ✅ DA.Finance packages in `.lib/` directory
- ✅ Network access to Canton participant: `https://participant.dev.canton.wolfedgelabs.com`

## Expected Output

### Successful Build
```
Step 2: Building DAML project...
Compiling...
SUCCESS: DAR file built!
  Location: .daml\dist\prediction-markets-1.0.0.dar
```

### Successful Deployment
```
Step 3: Uploading DAR to Canton participant...
SUCCESS: DAR uploaded successfully!
  HTTP Status: 200
```

## Troubleshooting

### "daml: command not found"
- Open a **new terminal** (PowerShell or Command Prompt)
- Run `daml version` to verify installation
- If it doesn't work, you may need to restart your computer to refresh PATH

### "Lf1 is not supported"
- Packages are incompatible with SDK 2.10.2
- Try getting packages via quickstart-finance template (see `SDK_2.10.2_MIGRATION_GUIDE.md`)

### Build succeeds but deployment fails
- Check network connection
- Verify participant URL is correct
- Check if authentication is required

### "SDK not installed"
- Run: `daml install 2.10.2`
- Verify: `daml version` should show `2.10.2`

## After Successful Deployment

Once the DAR file is uploaded to Canton:

1. **Verify Contracts**: The contracts are now available on the Canton ledger
2. **Initialize MarketConfig**: Create a `MarketConfig` contract (if not already done)
3. **Test Market Creation**: Use the frontend to create a market
4. **Test AMM**: Test liquidity pool creation and trading

## Manual Steps (if scripts don't work)

### Step 1: Build
```bash
daml build
```

### Step 2: Deploy
```bash
# Try v2 endpoint first
curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages \
  -H "Content-Type: application/octet-stream" \
  --data-binary @.daml/dist/prediction-markets-1.0.0.dar

# If v2 fails, try v1
curl -X POST https://participant.dev.canton.wolfedgelabs.com/v1/packages \
  -H "Content-Type: application/octet-stream" \
  --data-binary @.daml/dist/prediction-markets-1.0.0.dar
```

## Next Steps After Deployment

1. **Frontend Integration**: The frontend can now create markets using the deployed contracts
2. **Market Creation**: Users can create prediction markets
3. **AMM Trading**: Users can add liquidity and trade positions
4. **Oracle Integration**: Connect oracle for market resolution

