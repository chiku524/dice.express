# Version Compatibility Matrix

This document outlines the compatibility between SDK versions, API versions, LF targets, and Canton.

## SDK Versions

### SDK 3.4.9
- **API Version**: v2 (Ledger API v2)
- **Script Type**: `Script` (from `Daml.Script`)
- **Supported LF Targets**: 2.1, 2.0, 1.15, 1.14
- **Canton Support**: ⚠️ May not work (Canton devnet may only support v1 API)
- **Setup Script**: `daml/Setup.daml`

**When to use**:
- If Canton supports v2 API
- For newer Daml features
- If you need LF 2.1 features

### SDK 2.10.0
- **API Version**: v1 (Ledger API v1)
- **Script Type**: `Scenario` (from `DA.Script`)
- **Supported LF Targets**: 1.14, 1.13, 1.12
- **Canton Support**: ✅ Should work (Canton supports v1 API)
- **Setup Script**: `daml/Setup-2.10.0.daml`

**When to use**:
- If Canton only supports v1 API
- For compatibility with older Canton versions
- If DAML Script with SDK 3.4.9 fails

## LF Target Versions

### LF 2.1
- **SDK Support**: 3.4.9+
- **Features**: Latest Daml features, no contract keys
- **Use with**: SDK 3.4.9

### LF 1.14
- **SDK Support**: 2.10.0, 3.4.9
- **Features**: Stable, widely supported
- **Use with**: SDK 2.10.0 (recommended) or SDK 3.4.9

## API Endpoints

### JSON API v1
- **Base Path**: `/json-api/v1/`
- **Command Endpoint**: `/v1/command`
- **Query Endpoint**: `/v1/query`
- **Format**: `{ commands: { party, applicationId, commandId, list: [...] } }`

### JSON API v2
- **Base Path**: `/json-api/v2/`
- **Command Endpoint**: `/v2/commands/submit-and-wait`
- **Query Endpoint**: `/v2/query`
- **Format**: `{ actAs: [string], commandId: string, commands: [Command] }`

## Compatibility Matrix

| SDK Version | LF Target | API Version | Canton Support | Setup Script |
|------------|-----------|-------------|----------------|--------------|
| 3.4.9 | 2.1 | v2 | ⚠️ May not work | Setup.daml |
| 3.4.9 | 1.14 | v2 | ⚠️ May not work | Setup.daml |
| 2.10.0 | 1.14 | v1 | ✅ Should work | Setup-2.10.0.daml |

## Recommended Configurations

### For Canton Devnet (v1 API)
```yaml
sdk-version: 2.10.0
build-options:
  - --target=1.14
```

**Setup Script**: `daml/Setup-2.10.0.daml`

### For Canton with v2 API Support
```yaml
sdk-version: 3.4.9
build-options:
  - --target=2.1
```

**Setup Script**: `daml/Setup.daml`

## Fallback Options

If DAML Script doesn't work, use:
- **JSON API Script**: `scripts/setup-via-json-api.js`
- **Unified Setup**: `scripts/unified-setup.ps1` (tries all methods)

## Checking Compatibility

Run the compatibility checker:
```bash
node scripts/check-compatibility.js
```

Or verify Canton capabilities:
```bash
node scripts/verify-canton-capabilities.js
```

## Switching SDK Versions

Use the helper script:
```powershell
.\scripts\switch-sdk-version.ps1 -Version "2.10.0"
```

This will:
1. Update `daml.yaml` with the new SDK version
2. Update LF target to compatible version
3. Switch Setup script if needed
4. Prompt you to rebuild

## Troubleshooting

### "Method not found" Error
- **Cause**: API version mismatch (v2 vs v1)
- **Solution**: Switch to SDK 2.10.0 or use JSON API fallback

### "Couldn't match type 'Scenario' with 'Script'"
- **Cause**: Using wrong SDK version for script type
- **Solution**: Use `Setup-2.10.0.daml` for SDK 2.10.0, `Setup.daml` for SDK 3.4.9

### "Endpoint not found" (404)
- **Cause**: Wrong API endpoint or version
- **Solution**: Run `verify-canton-capabilities.js` to find available endpoints

