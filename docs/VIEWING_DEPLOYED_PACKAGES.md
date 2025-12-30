# Viewing Deployed DAR Files / Packages

## Where to View Deployed Packages

### 1. Block Explorer (Web UI)
**URL**: https://devnet.ccexplorer.io/

The block explorer shows:
- Deployed packages
- Contracts created from those packages
- Transactions
- Party information

**How to use**:
1. Navigate to https://devnet.ccexplorer.io/
2. Search for package ID: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
3. Or search for package name: `prediction-markets`
4. View package details, templates, and contracts

### 2. JSON API Endpoint
**Endpoint**: `GET /v2/packages`

```powershell
# PowerShell
$token = (Get-Content token.json | ConvertFrom-Json).access_token
Invoke-RestMethod -Uri "https://participant.dev.canton.wolfedgelabs.com/json-api/v2/packages" `
    -Headers @{ "Authorization" = "Bearer $token" }
```

```bash
# Bash
curl -H "Authorization: Bearer $(jq -r '.access_token' token.json)" \
    https://participant.dev.canton.wolfedgelabs.com/json-api/v2/packages
```

### 3. gRPC Admin API
**Service**: `com.digitalasset.canton.admin.participant.v30.PackageService/ListPackages`

Use the provided scripts:
```powershell
.\scripts\list-packages.ps1
```

```bash
./scripts/list-packages.sh
```

### 4. Using Our Scripts

#### PowerShell
```powershell
# List packages via gRPC Admin API (default)
.\scripts\list-packages.ps1

# List packages via JSON API
.\scripts\list-packages.ps1 -UseJsonApi
```

#### Bash
```bash
# List packages via gRPC Admin API (default)
./scripts/list-packages.sh

# List packages via JSON API
USE_JSON_API=true ./scripts/list-packages.sh
```

## Expected Package Information

- **Package ID**: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
- **Package Name**: `prediction-markets`
- **Version**: `1.0.0`
- **Templates**:
  - `Token:TokenBalance`
  - `PredictionMarkets:MarketConfig`
  - `PredictionMarkets:MarketCreationRequest`
  - `PredictionMarkets:Market`
  - `PredictionMarkets:OracleDataFeed`
  - `PredictionMarkets:Position`
  - `AMM:AllocationRequirement`
  - `AMM:SettlementRequest`
  - `AMM:LiquidityPool`
  - `AMM:PoolFactory`

## Verifying Package Vetting Status

After deploying with `vet_all_packages: true`, the package should be:
- ✅ Uploaded to the participant
- ✅ Vetted automatically
- ✅ Available for use with package name: `#prediction-markets:Module:Template`
- ✅ Available with explicit package ID: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:Module:Template`

## What to Look For

When listing packages, you should see:
1. **Package ID** matches: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
2. **Package Name** (if available): `prediction-markets`
3. **Vetting Status**: Should show as vetted if `vet_all_packages: true` was used
4. **Templates**: All templates from the DAR file should be listed

---

## Will Test Contracts Succeed Now?

### ✅ What Vetting Fixes

With `vet_all_packages: true` and `synchronize_vetting: true`:

1. **Package Name Support**: Can use `#prediction-markets:Token:TokenBalance` instead of explicit package ID
2. **Package Availability**: Package is immediately available after upload
3. **No Package Selection Errors**: Should eliminate `JSON_API_PACKAGE_SELECTION_FAILED` errors

### ❌ What Vetting Does NOT Fix

**The `NO_SYNCHRONIZER_FOR_SUBMISSION` error is still present**:

- ✅ Permissions: Party has `actAs` and `readAs` (confirmed)
- ✅ Participant: Connected to domain (confirmed)
- ✅ Package: Now vetted (after redeployment)
- ❌ **Synchronizer**: Party still needs synchronizer enabled (blocking issue)

### Current Status

**After redeployment with vetting enabled**:
- ✅ Package vetting issues should be resolved
- ✅ Can use package name in template IDs
- ❌ Contract creation will still fail with `NO_SYNCHRONIZER_FOR_SUBMISSION`
- ⏳ **Once synchronizer is fixed, contracts should work**

### Next Steps

1. **Redeploy DAR** with vetting enabled:
   ```powershell
   .\scripts\deploy-via-grpc-admin.ps1
   ```

2. **Verify package is vetted**:
   ```powershell
   .\scripts\list-packages.ps1
   ```

3. **Test contract creation** (will still fail with synchronizer error, but package errors should be gone)

4. **Wait for synchronizer fix** from client - this is the remaining blocking issue

## Summary

- **View packages**: Use `list-packages.ps1` script or block explorer
- **Vetting helps**: Resolves package name issues
- **Synchronizer still needed**: Contracts won't work until party synchronizer is enabled
- **After synchronizer fix**: All contracts should work correctly

