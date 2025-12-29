# Contract Creation Tools Summary

This document summarizes all the tools available for optimal contract creation workflow.

## 🎯 Quick Start

```powershell
# 1. Check compatibility
node scripts/check-compatibility.js

# 2. Verify Canton capabilities
node scripts/verify-canton-capabilities.js

# 3. Run unified setup (tries all methods)
.\scripts\unified-setup.ps1 -Username "user@example.com" -Password "password"
```

## 📋 Available Tools

### 1. Compatibility Checker
**File**: `scripts/check-compatibility.js`

**Purpose**: Verifies SDK versions, LF targets, and dependencies are compatible

**Usage**:
```bash
node scripts/check-compatibility.js
```

**Checks**:
- ✅ SDK version in `daml.yaml`
- ✅ LF target compatibility
- ✅ Setup script syntax
- ✅ JSON API script availability

**Output**: Compatibility status and recommendations

---

### 2. Canton Capabilities Verifier
**File**: `scripts/verify-canton-capabilities.js`

**Purpose**: Tests what endpoints and API versions are available on Canton

**Usage**:
```bash
node scripts/verify-canton-capabilities.js
```

**Tests**:
- OpenAPI documentation endpoints
- Command endpoints (v1/v2)
- Query endpoints (v1/v2)
- Authentication requirements

**Output**: Available endpoints and API versions

---

### 3. Unified Setup Script
**File**: `scripts/unified-setup.ps1`

**Purpose**: Tries all setup methods in order until one succeeds

**Usage**:
```powershell
.\scripts\unified-setup.ps1 `
    -Username "user@example.com" `
    -Password "password" `
    -AdminParty "Admin" `
    -OracleParty "Oracle"
```

**Methods Tried**:
1. DAML Script (SDK 3.4.9) - if SDK 3.4.9 is active
2. DAML Script (SDK 2.10.0) - if SDK 2.10.0 is active
3. JSON API Script - as fallback

**Advantages**:
- ✅ Automatic fallback
- ✅ Single command
- ✅ Handles all scenarios

---

### 4. SDK Version Switcher
**File**: `scripts/switch-sdk-version.ps1`

**Purpose**: Easily switch between SDK versions

**Usage**:
```powershell
.\scripts\switch-sdk-version.ps1 -Version "2.10.0"
# or
.\scripts\switch-sdk-version.ps1 -Version "3.4.9"
```

**What it does**:
- Updates `daml.yaml` with new SDK version
- Updates LF target to compatible version
- Switches Setup script if needed
- Prompts for rebuild

---

### 5. DAML Script Setup (SDK 3.4.9)
**File**: `daml/Setup.daml`

**Purpose**: Automated setup using DAML Script (v2 API)

**Usage**:
```powershell
# Get token
.\scripts\get-keycloak-token.ps1 -Username "user@example.com" -Password "password"
.\scripts\extract-token.ps1

# Run setup
.\scripts\run-setup-script.ps1 -Password "password"
```

**Features**:
- ✅ Allocates parties automatically
- ✅ Creates TokenBalance contract
- ✅ Creates MarketConfig contract

**Requirements**:
- SDK 3.4.9
- Canton v2 API support

---

### 6. DAML Script Setup (SDK 2.10.0)
**File**: `daml/Setup-2.10.0.daml`

**Purpose**: Automated setup using DAML Script (v1 API)

**Usage**:
```powershell
# Switch SDK
.\scripts\switch-sdk-version.ps1 -Version "2.10.0"
daml build

# Get token
.\scripts\get-keycloak-token.ps1 -Username "user@example.com" -Password "password"
.\scripts\extract-token.ps1

# Run setup
.\scripts\run-setup-script.ps1 -Password "password"
```

**Features**:
- ✅ Allocates parties automatically
- ✅ Creates TokenBalance contract
- ✅ Creates MarketConfig contract
- ✅ Compatible with Canton v1 API

**Requirements**:
- SDK 2.10.0
- Canton v1 API support

---

### 7. JSON API Setup Script
**File**: `scripts/setup-via-json-api.js`

**Purpose**: Fallback setup using JSON API (works with any API version)

**Usage**:
```powershell
.\scripts\run-setup-json-api.ps1 `
    -Username "user@example.com" `
    -Password "password" `
    -AdminParty "Admin" `
    -OracleParty "Oracle"
```

**Features**:
- ✅ Works with v1 and v2 API formats
- ✅ Tries multiple endpoints automatically
- ✅ Better error messages
- ✅ More control

**Requirements**:
- Parties must be allocated beforehand
- Authentication token (if required)

---

## 🔄 Workflow Recommendations

### For First-Time Setup

1. **Check Compatibility**
   ```bash
   node scripts/check-compatibility.js
   ```

2. **Verify Canton**
   ```bash
   node scripts/verify-canton-capabilities.js
   ```

3. **Run Unified Setup**
   ```powershell
   .\scripts\unified-setup.ps1 -Username "user@example.com" -Password "password"
   ```

### For API Version Mismatch

1. **Switch SDK Version**
   ```powershell
   .\scripts\switch-sdk-version.ps1 -Version "2.10.0"
   daml build
   ```

2. **Run Setup Again**
   ```powershell
   .\scripts\unified-setup.ps1 -Username "user@example.com" -Password "password"
   ```

### For Troubleshooting

1. **Verify Endpoints**
   ```bash
   node scripts/verify-canton-capabilities.js
   ```

2. **Check Compatibility**
   ```bash
   node scripts/check-compatibility.js
   ```

3. **Try JSON API Fallback**
   ```powershell
   .\scripts\run-setup-json-api.ps1 -Username "user@example.com" -Password "password"
   ```

## 📊 Version Compatibility Matrix

| SDK | LF Target | API Version | Canton Support | Setup Script |
|-----|-----------|-------------|----------------|--------------|
| 3.4.9 | 2.1 | v2 | ⚠️ May not work | Setup.daml |
| 2.10.0 | 1.14 | v1 | ✅ Should work | Setup-2.10.0.daml |

See [VERSION_COMPATIBILITY.md](./VERSION_COMPATIBILITY.md) for details.

## 🎯 Best Practices

1. **Always check compatibility first**
   - Run `check-compatibility.js` before building
   - Verify Canton capabilities after deployment

2. **Use unified setup for initial setup**
   - Single command tries all methods
   - Automatic fallback

3. **Keep both SDK versions available**
   - `Setup.daml` for SDK 3.4.9
   - `Setup-2.10.0.daml` for SDK 2.10.0

4. **Use JSON API as fallback**
   - Always available
   - Works regardless of API version

5. **Document your setup**
   - Note which method worked
   - Keep track of party names
   - Save contract IDs

## 📚 Related Documentation

- [VERSION_COMPATIBILITY.md](./VERSION_COMPATIBILITY.md) - Detailed compatibility matrix
- [WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md) - Step-by-step workflow
- [SETUP_SCRIPTS_GUIDE.md](./SETUP_SCRIPTS_GUIDE.md) - Setup script details

## 🐛 Troubleshooting

### "Method not found" Error
- **Solution**: Switch to SDK 2.10.0 or use JSON API

### "Endpoint not found" (404)
- **Solution**: Run `verify-canton-capabilities.js` to find available endpoints

### "Party not allocated"
- **Solution**: Use DAML Script (auto-allocates) or manually allocate

### "Template not found"
- **Solution**: Redeploy DAR file using `deploy-via-grpc-admin.ps1`

## ✅ Verification Checklist

After setup, verify:
- [ ] `TokenBalance` contract created
- [ ] `MarketConfig` contract created
- [ ] Parties allocated correctly
- [ ] Contract IDs saved
- [ ] Frontend can query contracts
- [ ] Frontend can create markets

