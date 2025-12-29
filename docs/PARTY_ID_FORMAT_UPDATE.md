# Party ID Format Update

## Discovery

When checking the block explorer at:
https://devnet.ccexplorer.io/parties/ee15aa3d-0bd4-44f9-9664-b49ad7e308aa%3A%3A122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292

**Finding**: The full party ID mapped format appears in the block explorer, confirming it's the correct format to use.

## Party ID Formats

### Full Party ID Mapped (✅ Correct)
```
ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292
```
- Format: `<keycloak-user-id>::<party-id>`
- **This is the format that appears in the block explorer**
- **This is the format we should use in JSON API requests**

### Short Wallet Address (❌ Not Found in Explorer)
```
122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292
```
- This is just the party ID portion
- Does not appear in block explorer when searched alone

## Updated Scripts

All scripts have been updated to use the full party ID mapped format by default:

- `scripts/test-with-wallet-address.js` - Defaults to full party ID
- `scripts/setup-via-json-api.js` - Defaults to full party ID
- `scripts/debug-request-format.js` - Uses full party ID
- `scripts/test-template-formats.js` - Uses full party ID

## Usage

### Option 1: Use Default (Full Party ID)
```bash
node scripts/test-with-wallet-address.js
```

### Option 2: Set via Environment Variable
```bash
export PARTY_ID="ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292"
node scripts/setup-via-json-api.js
```

### Option 3: Pass as Argument
```bash
node scripts/test-with-wallet-address.js "ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292"
```

## Status

- ✅ Party ID format confirmed via block explorer
- ✅ Scripts updated to use full party ID mapped format
- ⏭️ Still getting 400 "Invalid value for: body" (template ID format issue remains)

## Next Steps

The party ID format is now correct. The remaining issue is the template ID format or request body structure. We still need:

1. Correct template ID format for `Token:TokenBalance`
2. Confirmation of request body structure
3. Or example of working JSON API request

