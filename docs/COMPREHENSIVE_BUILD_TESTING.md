# Comprehensive DAML Build Testing Plan

## Overview

We're testing **all possible approaches** to build the DAML contracts, including:
1. Different SDK versions
2. Different DA.Finance package versions
3. Different LF target versions
4. Building DA.Finance from source
5. Using DPM package resolution

## Test Approaches

### Approach 1: Different SDK Versions

**Test Script**: `scripts/test-sdk-versions.bat`

Tests:
- SDK 2.8.0 (LF 1.15)
- SDK 2.10.0 (LF 1.15)
- SDK 2.10.2 (LF 1.15)
- SDK 3.4.9 (LF 1.17/2.1)

**Current packages**: Use existing DA.Finance packages in `.lib/`

### Approach 2: Different LF Target Versions

**Test Script**: `scripts/test-all-build-approaches.ps1`

Tests combinations:
- SDK 2.8.0 + LF 1.15 target
- SDK 2.10.0 + LF 1.15 target
- SDK 2.10.2 + LF 1.15 target
- SDK 3.4.9 + LF 1.17 target
- SDK 3.4.9 + LF 2.0 target
- SDK 3.4.9 + LF 2.1 target

### Approach 3: Build DA.Finance from Source

**Step 1**: Download source
```powershell
scripts\download-daml-finance-source.ps1
```

**Step 2**: Build with LF 2.1 target
```powershell
scripts\build-finance-from-source.ps1
```

This will:
1. Clone DA.Finance repository
2. Build required packages with `--target=2.1`
3. Copy built .dar files to `.lib/` directory

### Approach 4: Download Different DA.Finance Versions

Try downloading:
- DA.Finance v1.15.0 (for SDK 2.8.0/2.10.0/2.10.2)
- DA.Finance v4.0.0 (for SDK 3.4.9)
- Latest DA.Finance version
- Specific versions from GitHub releases

### Approach 5: Use DPM Package Resolution

Try using DPM's automatic package resolution:
1. Remove `data-dependencies` from `daml.yaml`
2. Add packages to `dependencies` section
3. Let DPM resolve them automatically

### Approach 6: Quickstart-Finance Template

Use the `quickstart-finance` template to get compatible packages:
1. Create quickstart-finance project
2. Extract packages
3. Use those packages

## Execution Order

1. **First**: Test current setup with `--target=2.1` (already done - failed)
2. **Second**: Test different SDK versions with current packages
3. **Third**: Try building DA.Finance from source with LF 2.1
4. **Fourth**: Download different DA.Finance versions
5. **Fifth**: Try DPM automatic resolution
6. **Sixth**: Use quickstart-finance template

## Expected Outcomes

- **Best case**: One of the SDK/package combinations works
- **Good case**: Building from source with LF 2.1 works
- **Fallback**: Need to get compatible packages from client/DAML support

## Scripts Created

1. `test-all-build-approaches.ps1` - Comprehensive testing script
2. `test-sdk-versions.bat` - Test different SDK versions
3. `download-daml-finance-source.ps1` - Download DA.Finance source
4. `build-finance-from-source.ps1` - Build DA.Finance with LF 2.1

## Running Tests

### Quick Test (SDK Versions)
```cmd
scripts\test-sdk-versions.bat
```

### Comprehensive Test (All Approaches)
```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-all-build-approaches.ps1
```

### Build from Source
```powershell
# Step 1: Download
powershell -ExecutionPolicy Bypass -File scripts\download-daml-finance-source.ps1

# Step 2: Build
powershell -ExecutionPolicy Bypass -File scripts\build-finance-from-source.ps1
```

## Results Tracking

Results will be saved to:
- `build-test-results.json` - Comprehensive test results
- Console output - Real-time test progress

