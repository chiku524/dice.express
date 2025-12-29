# Quick Start: Deploy to Canton

## Current Status

Based on your terminal output:
- ✅ DAML SDK is installed (versions 2.8.0, 2.10.0, 3.4.9 available)
- ❌ SDK 2.10.2 is **not installed** (required by `daml.yaml`)
- ⚠️ PowerShell execution policy is blocking scripts

## Solution: Use the Batch Script

Since PowerShell has execution policy restrictions, use the **batch script** that handles everything:

### Step 1: Run the Installation & Deployment Script

**In Command Prompt (cmd.exe)**, run:

```cmd
.\scripts\install-sdk-and-build.bat
```

This script will:
1. ✅ Check DAML SDK is available
2. ✅ Install SDK 2.10.2 automatically
3. ✅ Verify installation
4. ✅ Build the DAML project
5. ✅ Deploy to Canton

## Alternative: Manual Steps

If you prefer to do it manually:

### Step 1: Install SDK 2.10.2

```cmd
daml install 2.10.2
```

### Step 2: Verify Installation

```cmd
daml version
```

Should show: `2.10.2`

### Step 3: Build Project

```cmd
daml build
```

### Step 4: Deploy to Canton

```cmd
curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages -H "Content-Type: application/octet-stream" --data-binary "@.daml\dist\prediction-markets-1.0.0.dar"
```

If v2 fails, try v1:
```cmd
curl -X POST https://participant.dev.canton.wolfedgelabs.com/v1/packages -H "Content-Type: application/octet-stream" --data-binary "@.daml\dist\prediction-markets-1.0.0.dar"
```

## Expected Results

### Successful Build
```
Step 4: Building DAML project...
Compiling...
SUCCESS: DAR file built!
  Location: .daml\dist\prediction-markets-1.0.0.dar
```

### Successful Deployment
```
Step 5: Uploading DAR to Canton participant...
SUCCESS: DAR uploaded via v2 endpoint!
```

## Troubleshooting

### "Lf1 is not supported" Error

If you get this error during build, the packages are still incompatible. Try:

1. **Get packages via quickstart-finance template:**
   ```cmd
   daml new quickstart-finance-test --template=quickstart-finance
   cd quickstart-finance-test
   get-dependencies.bat
   copy .lib\*.dar ..\..\.lib\
   cd ..\..
   ```

2. **Then rebuild:**
   ```cmd
   daml build
   ```

### Build Succeeds but Deployment Fails

- Check network connection
- Verify participant URL is accessible
- Check if authentication is required

## After Successful Deployment

Once the DAR is uploaded:
- ✅ Contracts are on-chain
- ✅ Frontend can create markets
- ✅ Market creation will work
- ✅ AMM functionality available

## Quick Command Reference

```cmd
REM Install SDK
daml install 2.10.2

REM Build
daml build

REM Deploy (v2)
curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages -H "Content-Type: application/octet-stream" --data-binary "@.daml\dist\prediction-markets-1.0.0.dar"

REM Deploy (v1 fallback)
curl -X POST https://participant.dev.canton.wolfedgelabs.com/v1/packages -H "Content-Type: application/octet-stream" --data-binary "@.daml\dist\prediction-markets-1.0.0.dar"
```

