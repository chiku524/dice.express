# DAML SDK Dependency Issue

## Problem

The build is failing with:
```
damlc: C:\Users\chiku\AppData\Roaming\daml\sdk\2.8.0\daml-libs\daml-contracts-1.0.0-1.15.dar: openBinaryFile: does not exist
```

The SDK libs directory is empty, meaning dependencies weren't downloaded during SDK installation.

## Solution Options

### Option 1: Reinstall DAML SDK (Recommended)

1. **Uninstall current SDK:**
   - Delete: `C:\Users\chiku\AppData\Roaming\daml`
   - Or use: `daml uninstall` (if available)

2. **Reinstall SDK 2.8.0:**
   ```cmd
   daml install 2.8.0
   ```

3. **Verify dependencies:**
   ```cmd
   dir C:\Users\chiku\AppData\Roaming\daml\sdk\2.8.0\daml-libs
   ```
   Should show `.dar` files including `daml-contracts-*.dar`

### Option 2: Update to Newer SDK Version

The project can be updated to use a newer SDK version (3.4.x) which has better dependency management:

1. **Update `daml.yaml`:**
   ```yaml
   sdk-version: 3.4.0  # or latest 3.4.x
   ```

2. **Install new SDK:**
   ```cmd
   daml install 3.4.0
   ```

3. **Update dependencies** (may need adjustment):
   ```yaml
   dependencies:
     - daml-stdlib
     - daml-script
     - daml-prim
     - daml-contracts-sdk-3.4.0  # Updated package name
     # ... other dependencies
   ```

### Option 3: Manual Dependency Download

If the above don't work, dependencies can be manually downloaded from:
- DAML SDK releases: https://github.com/digital-asset/daml/releases
- Extract the SDK tarball and copy `.dar` files to the libs directory

## Quick Fix to Try First

Run this in Command Prompt (where `daml version` works):

```cmd
cd C:\Users\chiku\OneDrive\Desktop\coding-projects\upwork-canton-daml-project
daml install 2.8.0 --force
daml build
```

If that doesn't work, try updating to SDK 3.4.0 as shown in Option 2.

