# Using DPM with Your Project

## DPM is Installed! ✅

You've confirmed DPM is working with `dpm --version` showing version 1.0.4.

## Next Steps

### Option 1: Use `dpm build` (Recommended)

DPM has its own build command that should automatically handle dependencies:

```bash
# Navigate to your project
cd C:\Users\chiku\OneDrive\Desktop\coding-projects\upwork-canton-daml-project

# Build using DPM (this should automatically resolve dependencies)
dpm build
```

This should:
- Automatically download the correct DA.Finance packages for SDK 3.4.9
- Resolve all dependencies with correct LF versions
- Build your project successfully

### Option 2: Use `daml build` with DPM

If `daml build` is still using the old dependency system, you may need to:

1. **Ensure DPM is managing dependencies:**
   - DPM should automatically handle dependencies when you run `daml build`
   - Make sure your `daml.yaml` uses regular `dependencies:` (not `data-dependencies:`)

2. **Current `daml.yaml` configuration:**
   ```yaml
   sdk-version: 3.4.9
   dependencies:
     - daml-stdlib
     - daml-script
     - daml-prim
     - daml-finance-interface-account
     - daml-finance-interface-holding
     - daml-finance-interface-settlement
     - daml-finance-interface-types-common
     - daml-finance-interface-instrument-token
     - daml-finance-interface-util
   ```

3. **Try building:**
   ```bash
   daml build
   ```

### Troubleshooting

If you still get "Lf1 is not supported" error:

1. **Check if DPM is resolving packages:**
   - DPM should download packages to its own cache
   - Check: `%APPDATA%\.dpm\` or `%LOCALAPPDATA%\.dpm\`

2. **Clear old packages:**
   ```bash
   # Remove old .lib directory packages
   rmdir /s .lib
   
   # Clean build cache
   rmdir /s .daml
   
   # Try building again
   dpm build
   ```

3. **Verify DPM is active:**
   ```bash
   dpm version --active
   ```
   Should show: `3.4.9`

## Expected Result

Once DPM is working correctly:
- ✅ Dependencies automatically downloaded with correct LF versions
- ✅ Build succeeds without "Lf1 is not supported" error
- ✅ DAR file created in `.daml/dist/`

## If Issues Persist

1. Check DPM documentation: https://docs.digitalasset.com/build/3.4/dpm/dpm.html
2. Verify DPM can access package repositories
3. Check DPM logs for download errors

