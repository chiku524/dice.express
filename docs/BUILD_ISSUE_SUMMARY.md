# DAML Build Issue - Missing Dependencies

## Current Status

The DAML SDK is installed and working, but the build is failing because the DA.Finance interface packages are not available in the SDK libs directory.

## Error

```
damlc: C:\Users\chiku\AppData\Roaming\daml\sdk\2.8.0\daml-libs\daml-finance-interface-account-1.0.0-1.15.dar: openBinaryFile: does not exist
```

## Root Cause

The DA.Finance interface packages (`daml-finance-interface-*`) are **separate packages** that are not included in the standard DAML SDK installation. They need to be downloaded separately or the project needs to be configured to fetch them automatically.

## Solutions

### Option 1: Download DA.Finance Packages Manually (Recommended)

1. **Download the DA.Finance packages:**
   - Go to: https://github.com/digital-asset/daml-finance/releases
   - Download the release that matches SDK 2.8.0
   - Or download individual `.dar` files for:
     - `daml-finance-interface-account-1.0.0`
     - `daml-finance-interface-holding-1.0.0`
     - `daml-finance-interface-settlement-1.0.0`
     - `daml-finance-interface-types-common-1.0.0`
     - `daml-finance-interface-types-token-1.0.0`
     - `daml-finance-interface-util-1.0.0`

2. **Copy DAR files to SDK libs:**
   ```cmd
   copy *.dar C:\Users\chiku\AppData\Roaming\daml\sdk\2.8.0\daml-libs\
   ```

3. **Rename files to match expected format:**
   The build expects files like `daml-finance-interface-account-1.0.0-1.15.dar`
   You may need to rename or create symlinks.

### Option 2: Use DAML Package Manager (DPM) - SDK 3.4+

If you upgrade to SDK 3.4.9 (latest), you can use the new DPM which handles dependencies better:

1. **Update `daml.yaml`:**
   ```yaml
   sdk-version: 3.4.9
   ```

2. **Install SDK 3.4.9:**
   ```cmd
   daml install 3.4.9
   ```

3. **Update dependencies** - DPM uses different package names, so you'll need to check the DAML Finance documentation for SDK 3.4.x

### Option 3: Remove Finance Dependencies (If Not Critical)

If the Finance interfaces aren't being used yet, you could temporarily remove them from `daml.yaml` to get the build working, then add them back later when needed.

## Next Steps

**Recommended:** Try Option 1 first - manually download the DA.Finance packages and add them to the SDK libs directory. This is the quickest path to getting the build working with SDK 2.8.0.

If that doesn't work, consider Option 2 (upgrade to SDK 3.4.9) which has better package management, though it may require updating the DAML code for compatibility.

## Resources

- DAML Finance Releases: https://github.com/digital-asset/daml-finance/releases
- DAML SDK Releases: https://github.com/digital-asset/daml/releases
- DAML Documentation: https://docs.daml.com/

