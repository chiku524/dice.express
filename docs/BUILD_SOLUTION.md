# DAML Build Issues & Solutions

## Current Problem

The build is failing with `"ParseError \"Lf1 is not supported\""` when using SDK 3.4.9. This occurs because:
- Downloaded DA.Finance packages from GitHub releases appear to be LF version 1 format
- SDK 3.4.9 requires LF 1.17 compatible packages
- DPM cannot automatically resolve DA.Finance packages

## Root Cause

1. **Package Version Mismatch**: GitHub releases serve LF version 1 packages (348KB) instead of LF 1.17 packages
2. **DPM Limitation**: DPM doesn't have a built-in repository for DA.Finance packages
3. **Manual Download Issues**: All download methods result in the same incompatible packages

## Attempted Solutions

### ✅ Completed
- Cleaned all build caches
- Downloaded packages via multiple methods (curl, PowerShell, Node.js)
- Verified packages are valid DAR files
- Installed DPM 1.0.4
- Configured `data-dependencies` in `daml.yaml`

### ❌ Failed
- Direct package downloads from GitHub (serve LF version 1)
- DPM auto-resolution (packages not in DPM repository)
- SDK version switching (package compatibility issues)

## Current Configuration

- **SDK**: 3.4.9 (configured in `daml.yaml`)
- **DPM**: 1.0.4 (installed but cannot resolve DA.Finance packages)
- **Packages**: `.lib/` directory with manually downloaded packages (LF version 1, incompatible)
- **Build Status**: Blocked by LF version incompatibility

## Next Steps

1. **Awaiting DAML Support Response** (see `DAML_SUPPORT_EXPLANATION.md`)
   - How to configure DPM for DA.Finance packages
   - Correct package sources for SDK 3.4.9
   - Package compatibility matrix

2. **Alternative Approaches** (if support doesn't resolve):
   - Try different SDK version with compatible packages
   - Use alternative package sources
   - Build packages from source (if available)

## Files Status

- ✅ DAML code is compatible with SDK 3.4.9
- ✅ Packages downloaded and available (but wrong LF version)
- ✅ DPM installed and working
- ❌ Package LF version incompatibility preventing build

## Related Documentation

- `DAML_SUPPORT_EXPLANATION.md` - Detailed explanation for DAML support
- `DPM_BUILD_INSTRUCTIONS.md` - How to use DPM with this project
- `ATTEMPTED_SOLUTIONS.md` - Detailed log of all attempted solutions

