# Build Testing Progress

## Summary

We're testing all possible approaches to build the DAML contracts with DA.Finance dependencies.

## Approaches Tested

### ✅ Approach 1: Different SDK Versions
**Status**: Tested but encountered issues
- SDK 2.8.0, 2.10.0, 2.10.2, 3.4.9 all tested
- Issue: `daml` command wrapper always uses latest SDK (3.4.9)
- Need to use SDK-specific commands directly

### 🔄 Approach 2: Build DA.Finance from Source
**Status**: In Progress
- ✅ Successfully cloned DA.Finance repository
- ✅ Found all required packages:
  - `Daml.Finance.Interface.Types.Common.V3`
  - `Daml.Finance.Interface.Util.V3`
  - `Daml.Finance.Interface.Holding.V4`
  - `Daml.Finance.Interface.Account.V4`
  - `Daml.Finance.Interface.Settlement.V4`
  - `Daml.Finance.Interface.Instrument.Token.V4`
- ⚠️ Encountering YAML encoding issues when updating `daml.yaml` files
- **Next**: Fix YAML file writing to preserve proper encoding

### ⏭️ Approach 3: Download Different DA.Finance Versions
**Status**: Not yet tested
- Try downloading v1.15.0 packages for SDK 2.8.0/2.10.0
- Try downloading latest v4.0.0 packages
- Check GitHub releases for LF 2.1 compatible versions

### ⏭️ Approach 4: Use DPM Automatic Resolution
**Status**: Not yet tested
- Remove `data-dependencies` from `daml.yaml`
- Add packages to `dependencies` section
- Let DPM resolve automatically

### ⏭️ Approach 5: Quickstart-Finance Template
**Status**: Not yet tested
- Use quickstart-finance template to get compatible packages
- Extract and use those packages

## Current Issue

**YAML Encoding Problem**: When updating `daml.yaml` files in DA.Finance source, the files are getting corrupted with encoding issues. The YAML looks correct when displayed, but `dpm build` reports "MALFORMED_DAML_YAML: [1:1] string was used where mapping is expected".

**Possible Causes**:
1. UTF-8 BOM being added
2. Line ending issues (CRLF vs LF)
3. YAML parser being strict about formatting

**Solution Needed**: Fix the YAML file writing to preserve exact format and encoding.

## Next Steps

1. Fix YAML encoding issue in build script
2. Continue building DA.Finance packages from source
3. Test other approaches if source build fails
4. Document successful approach once found

