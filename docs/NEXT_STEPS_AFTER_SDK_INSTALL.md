# Next Steps After SDK Installation

## Current Status

✅ **SDK 2.10.2 installed successfully**  
❌ **Build not completed** (DAR file not found)

## Next Steps

### Step 1: Verify SDK 2.10.2 is Active

**In Command Prompt**, run:
```cmd
daml version
```

Should show: `2.10.2`

If it shows a different version, you may need to restart the terminal or run:
```cmd
daml install 2.10.2
```

### Step 2: Build the Project

**Option A: Use the build script (Recommended)**
```cmd
.\scripts\build-only.bat
```

**Option B: Manual build**
```cmd
daml build
```

### Step 3: Check Build Result

After building, check if the DAR file was created:
```cmd
.\scripts\check-build-status.bat
```

Or manually check:
```cmd
dir .daml\dist\*.dar
```

You should see: `prediction-markets-1.0.0.dar`

### Step 4: Deploy to Canton

**Option A: Use the deployment script (Recommended)**
```cmd
.\scripts\deploy-only.bat
```

**Option B: Manual deployment**
```cmd
curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages -H "Content-Type: application/octet-stream" --data-binary "@.daml\dist\prediction-markets-1.0.0.dar"
```

If v2 fails, try v1:
```cmd
curl -X POST https://participant.dev.canton.wolfedgelabs.com/v1/packages -H "Content-Type: application/octet-stream" --data-binary "@.daml\dist\prediction-markets-1.0.0.dar"
```

## Quick Command Sequence

Run these commands in order:

```cmd
REM 1. Verify SDK
daml version

REM 2. Build
daml build

REM 3. Deploy
curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages -H "Content-Type: application/octet-stream" --data-binary "@.daml\dist\prediction-markets-1.0.0.dar"
```

## Troubleshooting

### "Lf1 is not supported" Error

If you get this error during build, the packages are still incompatible. Try:

1. **Get packages via quickstart-finance:**
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

### Build Succeeds but No DAR File

- Check `.daml\dist\` directory exists
- Check for build errors in the output
- Try cleaning and rebuilding:
  ```cmd
  rmdir /s /q .daml
  daml build
  ```

### Deployment Fails

- Check network connection
- Verify participant URL is accessible
- Check if authentication is required
- Try both v1 and v2 endpoints

## Expected Results

### Successful Build
```
Building project...
Compiling...
SUCCESS: DAR file created: .daml\dist\prediction-markets-1.0.0.dar
```

### Successful Deployment
```
SUCCESS: DAR uploaded via v2 endpoint!
HTTP Code: 200
```

## After Successful Deployment

Once the DAR is uploaded:
- ✅ Contracts are on-chain
- ✅ Frontend can create markets
- ✅ Market creation will work
- ✅ AMM functionality available

