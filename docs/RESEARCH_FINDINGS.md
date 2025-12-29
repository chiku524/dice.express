# DAML SDK & DPM Package Compatibility Research

## Research Summary

Based on comprehensive research, here are the key findings for resolving the DAML SDK 3.4.9 and DA.Finance package compatibility issues:

## Key Findings

### 1. Package Naming Convention

**For SDK 3.4.9 with DPM, packages should use versioned names:**
- `daml-finance-interface-account-v4` (not `daml-finance-interface-account`)
- `daml-finance-interface-holding-v4`
- `daml-finance-interface-settlement-v4`
- `daml-finance-interface-types-common-v3` (note: v3, not v4)
- `daml-finance-interface-instrument-token-v4`
- `daml-finance-interface-util-v3` (note: v3, not v4)

### 2. Quickstart-Finance Template Approach

The **recommended way** to get compatible packages is using the `quickstart-finance` template:

```bash
daml new quickstart-finance --template=quickstart-finance
cd quickstart-finance
./get-dependencies.sh  # or get-dependencies.ps1 on Windows
```

This script:
- Downloads packages compatible with your SDK version
- Places them in `.lib/` directory
- Uses `data-dependencies` in `daml.yaml`

### 3. DPM Package Resolution

**DPM may not auto-resolve DA.Finance packages** because:
- DA.Finance packages are not in DPM's default repository
- DPM primarily knows about `daml-stdlib`, `daml-script`, `daml-prim`
- External packages need to be manually downloaded or configured

### 4. Package Version Compatibility

**SDK 3.4.9 Compatibility:**
- SDK 3.4.9 targets **LF 1.17**
- DA.Finance v4 packages should be LF 1.17 compatible
- However, downloaded packages appear to be LF version 1 (incompatible)

**SDK 2.10.0 Compatibility:**
- SDK 2.10.0 targets **LF 1.15**
- Would need DA.Finance v1.15.0 packages (not v4)
- v1.15.0 packages not available via direct download (404 errors)

## Recommended Solutions

### Solution 1: Use Quickstart-Finance Template (Recommended)

1. **Create quickstart-finance project:**
   ```bash
   daml new quickstart-finance --template=quickstart-finance
   cd quickstart-finance
   ```

2. **Download dependencies:**
   ```bash
   # Windows PowerShell
   .\get-dependencies.ps1
   
   # Or Unix/Mac
   ./get-dependencies.sh
   ```

3. **Copy packages to your project:**
   ```bash
   # Copy .lib directory from quickstart-finance to your project
   cp -r quickstart-finance/.lib ./your-project/.lib
   ```

4. **Use data-dependencies in daml.yaml:**
   ```yaml
   data-dependencies:
     - .lib/daml-finance-interface-account.dar
     - .lib/daml-finance-interface-holding.dar
     # ... etc
   ```

### Solution 2: Try Versioned Package Names in Dependencies

Update `daml.yaml` to use versioned package names:

```yaml
sdk-version: 3.4.9
dependencies:
  - daml-stdlib
  - daml-script
  - daml-prim
  - daml-finance-interface-account-v4
  - daml-finance-interface-holding-v4
  - daml-finance-interface-settlement-v4
  - daml-finance-interface-types-common-v3
  - daml-finance-interface-instrument-token-v4
  - daml-finance-interface-util-v3
```

Then try:
```bash
dpm build
```

### Solution 3: Check Package Repository Configuration

DPM might need a package repository configured. Check for:
- `dpm.yaml` configuration file
- Package repository URL settings
- Environment variables for package sources

## Package Version Matrix

| SDK Version | LF Version | DA.Finance Version | Package Names |
|------------|------------|-------------------|---------------|
| 3.4.9 | 1.17 | V4 (Interface) | `daml-finance-interface-*-v4` |
| 3.4.9 | 1.17 | V3 (Types Common/Util) | `daml-finance-interface-types-common-v3`, `daml-finance-interface-util-v3` |
| 2.10.0 | 1.15 | V1.15.0 | `daml-finance-interface-*-1.15.0` (not available) |

## Next Steps to Try

1. **Create quickstart-finance project and copy packages**
2. **Try versioned package names in dependencies**
3. **Check DPM repository configuration**
4. **Wait for DAML support response with official guidance**

## References

- [DAML Finance Building Applications](https://docs.daml.com/daml-finance/overview/building-applications.html)
- [DAML Finance Architecture](https://docs.daml.com/daml-finance/overview/architecture.html)
- [DPM Documentation](https://docs.digitalasset.com/build/3.4/dpm/dpm.html)

