# DPM Package Resolution Issue

## Problem

When running `dpm build`, DPM cannot find the DA.Finance packages:

```
Package daml-finance-interface-account could not be found, available packages are:
daml-script
```

## Root Cause

DPM doesn't have a built-in repository for DA.Finance packages. These packages need to be:
1. Downloaded manually, OR
2. Configured via `data-dependencies` in `daml.yaml`

## Solution: Use `data-dependencies`

Since DPM can't automatically resolve DA.Finance packages, we need to use `data-dependencies` to point to manually downloaded packages.

### Step 1: Download Packages

Run the PowerShell script to download packages:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\download-finance-for-dpm.ps1
```

Or manually download from:
- https://github.com/digital-asset/daml-finance/releases
- Look for v4.0.0 releases for SDK 3.4.9

### Step 2: Configure `daml.yaml`

The `daml.yaml` is already configured with `data-dependencies`:

```yaml
data-dependencies:
  - .lib/daml-finance-interface-account.dar
  - .lib/daml-finance-interface-holding.dar
  - .lib/daml-finance-interface-settlement.dar
  - .lib/daml-finance-interface-types-common.dar
  - .lib/daml-finance-interface-instrument-token.dar
  - .lib/daml-finance-interface-util.dar
```

### Step 3: Build

Now try building:

```bash
daml build
```

**Note:** Use `daml build` (not `dpm build`) when using `data-dependencies`, as DPM doesn't automatically resolve external packages.

## Alternative: Contact DAML Support

If the downloaded packages are still LF version 1 (causing "Lf1 is not supported" error), you may need to:

1. Ask DAML support for:
   - Correct package repository URL for DPM
   - How to configure DPM to use DA.Finance packages
   - Alternative package sources

2. Check if DPM needs a `dpm.yaml` configuration file with package repositories

## Current Status

- ✅ DPM is installed (version 1.0.4)
- ❌ DPM cannot find DA.Finance packages automatically
- ✅ Using `data-dependencies` as workaround
- ⚠️ Need to ensure downloaded packages are LF 1.17 (not LF 1)

