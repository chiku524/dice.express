# Deployment Script Update - Package Vetting

## Issue Identified

Our deployment scripts were setting `vet_all_packages = false` and `synchronize_vetting = false`, which prevented packages from being automatically vetted during upload. This likely contributed to package vetting issues.

## Client-Provided Script

The client provided a bash script that properly enables package vetting:

```bash
{
  "dars": [{
    "bytes": "${base64_encoded_dar}"
  }],
  "vet_all_packages": true,
  "synchronize_vetting": true
}
```

## Changes Made

### Updated PowerShell Scripts

1. **`scripts/deploy-via-grpc-admin.ps1`**
   - Changed: `vet_all_packages = $false` → `vet_all_packages = $true`
   - Changed: `synchronize_vetting = $false` → `synchronize_vetting = $true`

2. **`scripts/deploy-with-credentials.ps1`**
   - Changed: `vet_all_packages = $false` → `vet_all_packages = $true`
   - Changed: `synchronize_vetting = $false` → `synchronize_vetting = $true`

### New Bash Script

3. **`scripts/deploy-via-grpc-admin.sh`** (NEW)
   - Bash version of deployment script
   - Matches client's script format
   - Includes proper vetting configuration
   - Cross-platform compatible (handles both GNU and BSD base64)

## What This Fixes

### Before (vet_all_packages = false)
- Packages uploaded but not vetted
- Required manual vetting or explicit package ID usage
- Could cause `JSON_API_PACKAGE_SELECTION_FAILED` errors

### After (vet_all_packages = true)
- Packages automatically vetted during upload
- Can use package name in template IDs: `#prediction-markets:Module:Template`
- Synchronizes vetting across participants
- Should resolve package vetting issues

## Usage

### PowerShell (Windows)
```powershell
.\scripts\deploy-via-grpc-admin.ps1
.\scripts\deploy-with-credentials.ps1 -Username "user@example.com" -Password "password"
```

### Bash (Linux/macOS)
```bash
./scripts/deploy-via-grpc-admin.sh
```

## Vetting Parameters Explained

### `vet_all_packages: true`
- Automatically vets all packages in the DAR file during upload
- Makes packages available for use immediately after upload
- Required for package name-based template IDs to work

### `synchronize_vetting: true`
- Synchronizes vetting status across all participants
- Ensures consistent package availability
- Important for multi-participant scenarios

## Impact on Template IDs

### Before (No Vetting)
- Had to use explicit package ID: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:Token:TokenBalance`
- Package name lookup failed: `#prediction-markets:Token:TokenBalance` ❌

### After (With Vetting)
- Can use package name: `#prediction-markets:Token:TokenBalance` ✅
- Explicit package ID still works: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:Token:TokenBalance` ✅

## Next Steps

1. **Redeploy DAR with vetting enabled**
   ```powershell
   .\scripts\deploy-via-grpc-admin.ps1
   ```

2. **Verify package is vetted**
   - Check if package name-based template IDs work
   - Test contract creation with package name format

3. **Update frontend (optional)**
   - Can switch from explicit package ID to package name format
   - More maintainable (doesn't require package ID updates)

## Client Script Reference

The client's script structure:
```bash
grpc_upload_dar_request="{
  \"dars\": [{
    \"bytes\": \"${base64_encoded_dar}\"
  }],
  \"vet_all_packages\": true,
  \"synchronize_vetting\": true
}"

grpcurl \
  -H "Authorization: Bearer ${jwt_token}" \
  -d @ \
  ${canton_admin_api_url} ${canton_admin_api_grpc_package_service}.UploadDar \
  < <(echo ${grpc_upload_dar_request} | json)
```

## Notes

- **Base64 encoding**: Different Unix systems use different base64 commands
  - GNU (Linux): `base64 -w 0`
  - BSD (macOS): `base64 -i | tr -d '\n'`
  - Our script handles both

- **Token handling**: Script reads from `token.json` or prompts for token

- **Error handling**: Script exits on error with clear messages

## Verification

After deployment, verify package is vetted:

1. **Check package status** (if endpoint available)
2. **Test contract creation** with package name format
3. **Check logs** for vetting confirmation

## Related Issues

This addresses:
- Package vetting issues mentioned in `docs/CONTRACT_CREATION_ISSUES.md`
- `JSON_API_PACKAGE_SELECTION_FAILED` errors
- Need to use explicit package IDs instead of package names

