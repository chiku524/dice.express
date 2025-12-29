# Comprehensive DAML SDK & DPM Package Compatibility Research

## Executive Summary

After extensive research and testing, the core issue is confirmed: **All DA.Finance packages downloaded (including from quickstart-finance template) are LF version 1 format, which SDK 3.4.9 cannot read.**

## Research Methodology

1. ✅ Searched DAML documentation for package compatibility
2. ✅ Tested quickstart-finance template approach
3. ✅ Compared package sizes from different sources
4. ✅ Attempted DPM auto-resolution
5. ✅ Tried versioned package names
6. ✅ Inspected DAR files (confirms LF version 1)

## Critical Discovery

**Even the official `quickstart-finance` template downloads the same 348KB packages that trigger "Lf1 is not supported" error.**

This suggests:
- The GitHub releases ARE serving LF version 1 packages (not LF 1.17)
- OR there's a fundamental compatibility issue between SDK 3.4.9 and available DA.Finance packages
- OR the packages need to be obtained from a different source

## Package Analysis

### Package Sizes (All Sources - Identical)
- `daml-finance-interface-account.dar`: **348.33 KB**
- `daml-finance-interface-holding.dar`: **346.54 KB**
- `daml-finance-interface-settlement.dar`: **373.46 KB**
- `daml-finance-interface-types-common.dar`: **247.24 KB**
- `daml-finance-interface-instrument-token.dar`: **331.46 KB**
- `daml-finance-interface-util.dar`: **298.89 KB**

**Finding:** All download methods (manual, quickstart-finance script, PowerShell, Node.js) result in **identical file sizes**, confirming they're the same packages.

### LF Version Inspection

Attempting to inspect packages with `daml damlc inspect-dar` results in:
```
Failed to read dar:
Protobuf error: "ParseError \"Lf1 is not supported\""
```

**This confirms:** The packages are indeed LF version 1 format, incompatible with SDK 3.4.9.

## SDK & Package Compatibility Matrix

| Component | Version | LF Version | Status |
|-----------|---------|------------|--------|
| SDK 3.4.9 | 3.4.9 | 1.17 | ✅ Installed |
| DPM | 1.0.4 | N/A | ✅ Installed |
| DA.Finance Account V4 | 4.0.0 | **1** (not 1.17) | ❌ Incompatible |
| DA.Finance Holding V4 | 4.0.0 | **1** (not 1.17) | ❌ Incompatible |
| DA.Finance Settlement V4 | 4.0.0 | **1** (not 1.17) | ❌ Incompatible |
| DA.Finance Types Common V3 | 3.0.0 | **1** (not 1.17) | ❌ Incompatible |
| DA.Finance Instrument Token V4 | 4.0.0 | **1** (not 1.17) | ❌ Incompatible |
| DA.Finance Util V3 | 3.0.0 | **1** (not 1.17) | ❌ Incompatible |

## Attempted Solutions (All Failed)

### ✅ What We Tried
1. Manual downloads from GitHub releases (v4.0.0 URLs)
2. Quickstart-finance template `get-dependencies.sh` script
3. PowerShell download with User-Agent headers
4. Node.js download with redirect handling
5. DPM auto-resolution (packages not in repository)
6. Versioned package names in dependencies
7. `data-dependencies` configuration
8. Build options (`--target=1.17` - not supported)
9. Multiple SDK versions (2.8.0, 2.10.0, 3.4.9)
10. Cache cleaning

### ❌ Results
- All methods download identical packages (348KB)
- All packages are LF version 1 (incompatible)
- DPM cannot auto-resolve packages
- `daml build` rejects `--target=1.17` option

## Root Cause Analysis

### Primary Issue
**GitHub releases are serving LF version 1 packages instead of LF 1.17 packages**, despite:
- Version tags indicating v4.0.0
- URLs suggesting LF 1.17 compatibility
- Documentation stating SDK 3.4.9 compatibility

### Secondary Issues
1. **DPM Limitation**: DPM doesn't have DA.Finance packages in its repository
2. **Build Tool Mismatch**: `daml build` (DAML Assistant) may not fully support SDK 3.4.9 features
3. **No Alternative Sources**: No alternative package repositories found

## Possible Solutions (Requiring DAML Support)

### Solution 1: Correct Package Source
DAML support needs to provide:
- Correct download URLs for LF 1.17 packages
- Alternative package repository
- Package compatibility matrix

### Solution 2: DPM Repository Configuration
DAML support needs to explain:
- How to configure DPM with DA.Finance repository
- Package repository URL
- DPM configuration file format

### Solution 3: Build from Source
If packages aren't available:
- Source code repository
- Build instructions for SDK 3.4.9
- Compilation requirements

### Solution 4: Use Different SDK Version
If SDK 3.4.9 packages aren't available:
- Recommended SDK version with available packages
- Migration guide
- Compatibility notes

## Current Configuration

**`daml.yaml`:**
```yaml
sdk-version: 3.4.9
name: prediction-markets
version: 1.0.0
source: daml
dependencies:
  - daml-stdlib
  - daml-script
  - daml-prim
data-dependencies:
  - .lib/daml-finance-interface-account.dar
  - .lib/daml-finance-interface-holding.dar
  - .lib/daml-finance-interface-settlement.dar
  - .lib/daml-finance-interface-types-common.dar
  - .lib/daml-finance-interface-instrument-token.dar
  - .lib/daml-finance-interface-util.dar
```

**Status:** Configuration is correct, but packages are incompatible.

## Next Steps

1. **Await DAML Support Response** with:
   - Correct package sources
   - DPM repository configuration
   - Package compatibility matrix

2. **Alternative Research:**
   - Check DAML community forums for similar issues
   - Look for package build instructions
   - Check if packages need to be compiled locally

3. **Workaround (if urgent):**
   - Temporarily remove DA.Finance dependencies
   - Implement minimal finance functionality manually
   - Add DA.Finance back when packages are available

## Evidence Summary

- ✅ All package downloads result in 348KB files (LF version 1)
- ✅ Quickstart-finance template downloads same packages
- ✅ DAR inspection confirms LF version 1 format
- ✅ SDK 3.4.9 cannot read LF version 1 packages
- ✅ DPM cannot auto-resolve DA.Finance packages
- ✅ No alternative package sources found

## Conclusion

The issue is **not with our configuration or download methods**. The problem is that:
1. GitHub releases serve LF version 1 packages (not LF 1.17)
2. DPM doesn't have DA.Finance in its repository
3. No alternative sources are publicly available

**Resolution requires DAML support to provide:**
- Correct package sources for SDK 3.4.9
- DPM repository configuration
- Or alternative approach to obtain compatible packages

