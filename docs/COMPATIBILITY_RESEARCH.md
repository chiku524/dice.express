# DAML SDK & DPM Package Compatibility Research

## Research Summary

Comprehensive research into DAML SDK 3.4.9, DPM 1.0.4, and DA.Finance package compatibility.

## Key Findings

### 1. Quickstart-Finance Template Configuration

The `quickstart-finance` template uses:
- `data-dependencies` (not regular `dependencies`)
- `build-options: --target=1.17` (but this doesn't work with `daml build`)
- Packages downloaded via `get-dependencies.sh` script

**Important Discovery:** Even the quickstart-finance template downloads packages that are **348KB** (same as our manual downloads), suggesting these ARE the correct packages for SDK 3.4.9, but there may be a different issue.

### 2. Package Naming

**For DPM (if it supported auto-resolution):**
- `daml-finance-interface-account-v4`
- `daml-finance-interface-holding-v4`
- `daml-finance-interface-settlement-v4`
- `daml-finance-interface-types-common-v3` (note: v3)
- `daml-finance-interface-instrument-token-v4`
- `daml-finance-interface-util-v3` (note: v3)

**For data-dependencies (current approach):**
- `.lib/daml-finance-interface-account.dar`
- `.lib/daml-finance-interface-holding.dar`
- etc.

### 3. Build Options Issue

The quickstart-finance template includes:
```yaml
build-options:
  - --target=1.17
  - -Wno-upgrade-interfaces
  - -Wno-upgrade-exceptions
```

However, `daml build` rejects `--target=1.17` with:
```
option --target: Unknown Daml-LF version: 1.17
```

This suggests:
- `--target=1.17` might only work with `dpm build` (not `daml build`)
- Or the option syntax is different for `daml build`

### 4. Package Size Analysis

All downloaded packages (manual and quickstart-finance) are:
- `daml-finance-interface-account.dar`: 348.33 KB
- `daml-finance-interface-holding.dar`: 346.54 KB
- `daml-finance-interface-settlement.dar`: 373.46 KB
- `daml-finance-interface-types-common.dar`: 247.24 KB
- `daml-finance-interface-instrument-token.dar`: 331.46 KB
- `daml-finance-interface-util.dar`: 298.89 KB

**These sizes are consistent** across all download methods, suggesting:
- These ARE the correct v4.0.0 packages
- The "Lf1 is not supported" error might be from a different cause
- Possibly a transitive dependency issue

### 5. SDK Version Compatibility Matrix

| SDK Version | LF Version | DA.Finance Version | Status |
|------------|------------|-------------------|--------|
| 3.4.9 | 1.17 | V4 (Interface) | ✅ Should work, but getting "Lf1" error |
| 2.10.0 | 1.15 | V1.15.0 | ❌ Packages not available (404) |
| 2.8.0 | 1.15 | V1.15.0 | ❌ Packages not available (404) |

## Possible Root Causes

### Theory 1: Transitive Dependencies
The DA.Finance packages might have transitive dependencies that are LF version 1, causing the error even though the packages themselves are v4.

### Theory 2: Build Tool Mismatch
- `daml build` (DAML Assistant) might not support LF 1.17 properly
- `dpm build` might be required for SDK 3.4.9
- But `dpm build` can't find the packages

### Theory 3: Package Format Issue
The packages might be correctly downloaded but in a format that `daml build` can't read, even though they're valid DAR files.

### Theory 4: Cached Dependencies
There might be cached old dependencies (daml-stdlib, daml-prim) that are LF version 1, causing the conflict.

## Recommended Solutions to Try

### Solution 1: Use DPM Build (if packages are available)

Try using `dpm build` after ensuring packages are in the right location:

```bash
# Ensure packages are in .lib/
# Then try:
dpm build
```

### Solution 2: Check for Transitive Dependencies

Inspect the DAR files to see what dependencies they require:

```bash
daml damlc inspect-dar .lib/daml-finance-interface-account.dar
```

This might reveal if there are LF version 1 dependencies.

### Solution 3: Clean All Caches and Rebuild

```bash
# Remove all build artifacts
rm -rf .daml
rm -rf ~/.daml/cache  # if exists

# Rebuild from scratch
daml build
```

### Solution 4: Check SDK Installation

Verify that SDK 3.4.9 is correctly installed and not using cached old components:

```bash
daml version  # Should show 3.4.9
daml damlc --version  # Check compiler version
```

## Next Research Steps

1. **Inspect DAR files** to see their actual LF version and dependencies
2. **Check DPM repository configuration** - see if there's a way to add DA.Finance packages
3. **Try building with DPM** after manually placing packages
4. **Check for SDK 3.4.9 specific build requirements**

## References

- [DAML Finance Building Applications](https://docs.daml.com/daml-finance/overview/building-applications.html)
- [DAML Finance Architecture](https://docs.daml.com/daml-finance/overview/architecture.html)
- [DPM Documentation](https://docs.digitalasset.com/build/3.4/dpm/dpm.html)
- [DAML Packages Reference](https://docs.digitalasset.com/build/3.4/reference/daml/packages.html)

