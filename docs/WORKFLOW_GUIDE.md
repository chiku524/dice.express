# Optimal Workflow Guide for Contract Creation

This guide outlines the optimal workflow for setting up and creating contracts in the prediction markets application.

## Quick Start

### 1. Check Compatibility
```bash
node scripts/check-compatibility.js
```

This verifies:
- SDK version compatibility
- LF target compatibility
- Setup script availability

### 2. Verify Canton Capabilities
```bash
node scripts/verify-canton-capabilities.js
```

This tests:
- Available API endpoints (v1/v2)
- Command and query endpoints
- OpenAPI documentation availability

### 3. Run Unified Setup
```powershell
.\scripts\unified-setup.ps1 -Username "your-email@example.com" -Password "your-password"
```

This automatically:
1. Tries DAML Script (SDK 3.4.9) if that SDK is active
2. Tries DAML Script (SDK 2.10.0) if that SDK is active
3. Falls back to JSON API script if DAML Script fails

## Workflow Options

### Option A: DAML Script (Recommended if API compatible)

**For SDK 3.4.9:**
```powershell
# 1. Get authentication token
.\scripts\get-keycloak-token.ps1 -Username "user@example.com" -Password "password"
.\scripts\extract-token.ps1

# 2. Run setup script
.\scripts\run-setup-script.ps1 -Password "password"
```

**For SDK 2.10.0:**
```powershell
# 1. Switch SDK version
.\scripts\switch-sdk-version.ps1 -Version "2.10.0"

# 2. Rebuild
daml build

# 3. Get authentication token
.\scripts\get-keycloak-token.ps1 -Username "user@example.com" -Password "password"
.\scripts\extract-token.ps1

# 4. Run setup script
.\scripts\run-setup-script.ps1 -Password "password"
```

**Advantages:**
- ✅ Fully automated (allocates parties, creates contracts)
- ✅ Type-safe (Daml compiler validates everything)
- ✅ Single command execution

**Disadvantages:**
- ❌ Requires compatible API version
- ❌ May fail if Canton doesn't support the API version

### Option B: JSON API Script (Fallback)

```powershell
.\scripts\run-setup-json-api.ps1 `
    -Username "user@example.com" `
    -Password "password" `
    -AdminParty "Admin" `
    -OracleParty "Oracle"
```

**Advantages:**
- ✅ Works regardless of API version
- ✅ More control over the process
- ✅ Better error messages

**Disadvantages:**
- ❌ Requires parties to be allocated beforehand
- ❌ More manual steps

### Option C: Unified Setup (Best of Both)

```powershell
.\scripts\unified-setup.ps1 `
    -Username "user@example.com" `
    -Password "password" `
    -AdminParty "Admin" `
    -OracleParty "Oracle"
```

**Advantages:**
- ✅ Tries all methods automatically
- ✅ Falls back gracefully
- ✅ Single command

## Step-by-Step Workflow

### Initial Setup

1. **Check Current Configuration**
   ```bash
   node scripts/check-compatibility.js
   ```

2. **Verify Canton Endpoints**
   ```bash
   node scripts/verify-canton-capabilities.js
   ```

3. **Switch SDK if Needed**
   ```powershell
   # If Canton only supports v1 API
   .\scripts\switch-sdk-version.ps1 -Version "2.10.0"
   daml build
   ```

4. **Run Unified Setup**
   ```powershell
   .\scripts\unified-setup.ps1 -Username "user@example.com" -Password "password"
   ```

### Creating Markets (Frontend)

After setup is complete:

1. **Verify Contracts Exist**
   - Check that `MarketConfig` contract exists
   - Check that `TokenBalance` contract exists

2. **Create Market via Frontend**
   - Navigate to "Create Market" page
   - Fill in market details
   - Submit

3. **Troubleshoot if Needed**
   - Check browser console for errors
   - Check Vercel function logs
   - Verify party allocation

## Troubleshooting Workflow

### Issue: "Method not found" Error

**Diagnosis:**
```bash
node scripts/verify-canton-capabilities.js
```

**Solution:**
```powershell
# Switch to SDK 2.10.0 (v1 API)
.\scripts\switch-sdk-version.ps1 -Version "2.10.0"
daml build
.\scripts\unified-setup.ps1 -Username "user@example.com" -Password "password"
```

### Issue: "Endpoint not found" (404)

**Diagnosis:**
```bash
node scripts/verify-canton-capabilities.js
```

**Solution:**
- Use JSON API fallback script
- Check endpoint URL in configuration
- Verify JSON API is enabled on Canton

### Issue: "Party not allocated"

**Diagnosis:**
- Check if party exists on Canton
- Verify party name matches exactly

**Solution:**
- Use DAML Script (automatically allocates parties)
- Or manually allocate parties on Canton
- Then use JSON API script

### Issue: "Template not found"

**Diagnosis:**
- Check if DAR file is deployed
- Verify template ID format

**Solution:**
```powershell
# Redeploy DAR file
.\scripts\deploy-via-grpc-admin.ps1 -Username "user@example.com" -Password "password"
```

## Best Practices

1. **Always check compatibility first**
   ```bash
   node scripts/check-compatibility.js
   ```

2. **Use unified setup for initial setup**
   ```powershell
   .\scripts\unified-setup.ps1 -Username "user@example.com" -Password "password"
   ```

3. **Verify Canton capabilities after deployment**
   ```bash
   node scripts/verify-canton-capabilities.js
   ```

4. **Keep both SDK versions available**
   - `Setup.daml` for SDK 3.4.9
   - `Setup-2.10.0.daml` for SDK 2.10.0

5. **Use JSON API as fallback**
   - Always have `setup-via-json-api.js` available
   - Test it periodically to ensure it works

## Script Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `check-compatibility.js` | Verify SDK/LF compatibility | Before building |
| `verify-canton-capabilities.js` | Test Canton endpoints | After deployment |
| `unified-setup.ps1` | Try all setup methods | Initial setup |
| `switch-sdk-version.ps1` | Change SDK version | When API mismatch |
| `run-setup-script.ps1` | Run DAML Script | When API compatible |
| `run-setup-json-api.ps1` | Run JSON API setup | As fallback |

## Version Compatibility

See [VERSION_COMPATIBILITY.md](./VERSION_COMPATIBILITY.md) for detailed compatibility matrix.

## Next Steps

After successful setup:
1. Test market creation from frontend
2. Verify contracts are created correctly
3. Test market operations (trading, settlement)
4. Monitor for errors

