# Setup Scripts Guide

This project includes multiple setup scripts for different scenarios and SDK versions.

## Available Setup Scripts

### 1. `daml/Setup.daml` (SDK 3.4.9 - Default)

**For**: SDK 3.4.9 with v2 API support  
**Type**: DAML Script using `Script` type  
**Status**: ⚠️ May not work if Canton doesn't support v2 API

**Usage**:
```bash
daml script \
  --dar .daml/dist/prediction-markets-1.0.0.dar \
  --script-name Setup:setup \
  --ledger-host participant.dev.canton.wolfedgelabs.com \
  --ledger-port 443 \
  --access-token-file token.txt \
  --tls
```

**What it does**:
- Allocates parties (Admin, Oracle)
- Creates TokenBalance contract
- Creates MarketConfig contract

### 2. `daml/Setup-2.10.0.daml` (SDK 2.10.0)

**For**: SDK 2.10.0 with v1 API support  
**Type**: DAML Script using `Scenario` type  
**Status**: ✅ Should work with Canton v1 API (if syntax is correct)

**To use**:
1. Update `daml.yaml`: `sdk-version: 2.10.0`
2. Rename `Setup-2.10.0.daml` to `Setup.daml` (or update script-name)
3. Rebuild: `daml build`
4. Run: `daml script --dar .daml/dist/prediction-markets-1.0.0.dar --script-name Setup:setup ...`

**What it does**:
- Same as Setup.daml but uses `Scenario` syntax
- Compatible with Canton's v1 API

### 3. `scripts/setup-via-json-api.js` (JSON API Fallback)

**For**: When DAML Script doesn't work  
**Type**: Node.js script using JSON API  
**Status**: ✅ Available as fallback

**Usage**:
```bash
# With authentication
.\scripts\run-setup-json-api.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"

# Without authentication (if token.json exists)
.\scripts\run-setup-json-api.ps1

# With custom parties
.\scripts\run-setup-json-api.ps1 -AdminParty "YourAdmin" -OracleParty "YourOracle"
```

**Or directly**:
```bash
export ADMIN_PARTY="Admin"
export ORACLE_PARTY="Oracle"
export TOKEN_FILE="token.json"
node scripts/setup-via-json-api.js
```

**What it does**:
- Creates TokenBalance contract via JSON API
- Creates MarketConfig contract via JSON API
- Returns contract IDs

**Requirements**:
- Parties must be allocated beforehand
- Authentication token (if required)
- Correct template ID format

## Which Script to Use?

### Try in this order:

1. **DAML Script (SDK 3.4.9)** - `daml/Setup.daml`
   - ✅ Most automated (allocates parties)
   - ❌ May fail if Canton doesn't support v2 API

2. **DAML Script (SDK 2.10.0)** - `daml/Setup-2.10.0.daml`
   - ✅ Should work with Canton v1 API
   - ⚠️ Requires SDK version change and rebuild

3. **JSON API Script** - `scripts/setup-via-json-api.js`
   - ✅ Works if JSON API is available
   - ❌ Requires parties to be allocated first
   - ❌ More manual (need to handle errors)

## Quick Start

### Option 1: Try DAML Script First
```powershell
# Get token
.\scripts\get-keycloak-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"
.\scripts\extract-token.ps1

# Run setup
.\scripts\run-setup-script.ps1 -Password "Chikuji1!"
```

### Option 2: Use JSON API Fallback
```powershell
.\scripts\run-setup-json-api.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"
```

## Troubleshooting

### DAML Script Fails with "Method not found"
- **Cause**: API version mismatch (v2 vs v1)
- **Solution**: Try SDK 2.10.0 version or use JSON API

### JSON API Returns 400 Error
- **Cause**: Party not allocated or template ID format wrong
- **Solution**: Verify party allocation, check template ID format

### JSON API Returns 404 Error
- **Cause**: Endpoint not available
- **Solution**: Check endpoint URL, verify JSON API is enabled

## Files

- `daml/Setup.daml` - SDK 3.4.9 version (default)
- `daml/Setup-2.10.0.daml` - SDK 2.10.0 version
- `scripts/setup-via-json-api.js` - JSON API version
- `scripts/run-setup-json-api.ps1` - PowerShell wrapper for JSON API
- `scripts/run-setup-script.ps1` - PowerShell wrapper for DAML Script

