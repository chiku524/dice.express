# Building with DPM - Step by Step Instructions

## Current Situation

DPM is installed but cannot automatically find DA.Finance packages. We need to use `data-dependencies` with manually downloaded packages.

## Step-by-Step Instructions

### Step 1: Download DA.Finance Packages

**In PowerShell** (not Git Bash), run:

```powershell
cd C:\Users\chiku\OneDrive\Desktop\coding-projects\upwork-canton-daml-project
powershell -ExecutionPolicy Bypass -File .\scripts\download-finance-for-dpm.ps1
```

Or manually download from:
- https://github.com/digital-asset/daml-finance/releases
- Download v4.0.0 packages for SDK 3.4.9

### Step 2: Verify Packages Downloaded

Check that `.lib` directory contains:
- `daml-finance-interface-account.dar`
- `daml-finance-interface-holding.dar`
- `daml-finance-interface-settlement.dar`
- `daml-finance-interface-types-common.dar`
- `daml-finance-interface-instrument-token.dar`
- `daml-finance-interface-util.dar`

### Step 3: Build the Project

**Important:** Use `daml build` (not `dpm build`) when using `data-dependencies`:

```powershell
daml build
```

### Step 4: If You Get "Lf1 is not supported" Error

This means the downloaded packages are still LF version 1. Try:

1. **Check package versions:**
   - The packages should be v4.0.0 (LF 1.17)
   - If they're still LF 1, the GitHub releases may be serving cached files

2. **Contact DAML Support:**
   - Ask for correct package repository for DPM
   - Request alternative download sources
   - Get package compatibility matrix

3. **Alternative:**
   - Try using SDK 2.10.0 with compatible packages
   - Or wait for DAML support response

## Why `dpm build` Doesn't Work

DPM doesn't have a built-in repository for DA.Finance packages. It only knows about:
- `daml-stdlib`
- `daml-script`
- `daml-prim`

External packages like DA.Finance need to be:
- Downloaded manually
- Referenced via `data-dependencies` in `daml.yaml`

## Expected Result

Once packages are downloaded correctly:
- ✅ `daml build` succeeds
- ✅ DAR file created at `.daml/dist/prediction-markets-1.0.0.dar`
- ✅ No "Lf1 is not supported" error

## Next Steps After Successful Build

1. Deploy to Canton:
   ```bash
   curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages \
     -H "Content-Type: application/octet-stream" \
     --data-binary @.daml/dist/prediction-markets-1.0.0.dar
   ```

2. Verify deployment
3. Test market creation and AMM functionality

