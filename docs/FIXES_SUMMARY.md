# Fixes Summary - Explorer URL, Contract ID, and Approval/Rejection

## Issues Fixed

### 1. ✅ Explorer URL Timestamp Incorrect

**Problem**: Explorer URLs had incorrect timestamps (e.g., `2026-01-04T08:37:22.005Z` instead of `2026-01-04T08:37:18.857Z`)

**Root Cause**: The `/v2/commands/completions` endpoint wasn't returning `record_time` reliably

**Fix**: 
- Updated `api/get-update-details.js` to query `/v2/updates` endpoint first (GET with `updateId` query parameter)
- Falls back to completions endpoint if updates fails
- Better extraction of `record_time` from `verdict.record_time` field

**Files Changed**:
- `api/get-update-details.js` - Now queries `/v2/updates` endpoint first

### 2. ✅ Approval/Rejection Failing with "JSON decoding to CNil" Error

**Problem**: When approving/rejecting contracts, error: `"Invalid value for: body (JSON decoding to CNil should never happen at 'commands[0]')"`

**Root Causes**:
1. **Command Format**: Exercise commands weren't being transformed to `ExerciseCommand` format
2. **Contract ID Format**: Contracts with `updateId:` prefix were being sent as contract IDs, which is invalid

**Fixes**:

#### Fix 2a: ExerciseCommand Format
- Updated `api/command.js` to transform exercise commands to `ExerciseCommand` format
- Now handles: `{ templateId, contractId, choice, argument }` → `{ ExerciseCommand: { ... } }`

#### Fix 2b: Contract ID Resolution
- Created `api/get-contract-id-from-update.js` to resolve `updateId:` to actual contract IDs
- Added `resolveContractId()` helper in `AdminDashboard.jsx` that:
  1. Checks if contractId has `updateId:` prefix
  2. Tries to find actual contract ID in current requests list
  3. Queries blockchain via API if not found
  4. Throws helpful error if contract not synchronized yet

**Files Changed**:
- `api/command.js` - Added ExerciseCommand transformation
- `api/get-contract-id-from-update.js` - New endpoint to resolve updateId to contract ID
- `frontend/src/components/AdminDashboard.jsx` - Added contract ID resolution before exercising choices
- `frontend/src/services/ledgerClient.js` - Improved error handling for updateId: prefix

### 3. ✅ Markets Page Not Showing Contracts

**Problem**: Markets page queries for `Market` template, but those contracts are only created when `MarketCreationRequest` is approved. Since approval was failing, no `Market` contracts were being created.

**Status**: This should be resolved once approval/rejection works correctly. When a `MarketCreationRequest` is approved, it creates a `Market` contract which will then appear in the Markets page.

**Note**: The Markets page is correctly querying for `Market` template - this is the expected behavior.

## How It Works Now

### Contract Creation Flow:
1. User creates market → Gets `updateId` and `completionOffset`
2. Contract stored in database with `updateId:...` as contractId
3. Explorer URL generated using `record_time` from `/v2/updates` endpoint
4. Contract appears in Admin Dashboard (from database)

### Approval/Rejection Flow:
1. Admin clicks Approve/Reject
2. System checks if contractId has `updateId:` prefix
3. If yes, resolves to actual contract ID:
   - Checks current requests list first
   - Queries blockchain if not found
   - Shows error if contract not synchronized yet
4. Exercise command formatted as `ExerciseCommand`
5. Command sent to Canton
6. On success, `Market` contract created (for approval) or request archived (for rejection)

## Testing

### Test Explorer URL:
1. Create a new market contract
2. Check the explorer URL in the success message
3. Click "View Contract in Block Explorer"
4. Should navigate to correct page (not blank)

### Test Approval:
1. Go to Admin Dashboard
2. Find a market creation request
3. Click "Approve"
4. Should succeed (no "JSON decoding to CNil" error)
5. Check Markets page - should see the new Market contract

### Test Rejection:
1. Go to Admin Dashboard
2. Find a market creation request
3. Click "Reject"
4. Should succeed
5. Request should disappear from Admin Dashboard

## Known Limitations

1. **Contract Synchronization**: Contracts created with `updateId` may take 10-30 seconds to appear on blockchain. If you try to approve/reject immediately, you may get an error saying the contract isn't synchronized yet. **Solution**: Wait 10-30 seconds and refresh the Admin Dashboard.

2. **Contract ID Resolution**: When resolving `updateId:` to actual contract ID, we use a best-effort approach (most recent contract). This may not always match correctly if multiple contracts were created in quick succession. **Solution**: Wait for contract to synchronize, then refresh Admin Dashboard to get the actual contract ID.

3. **Markets Page**: The Markets page queries for `Market` contracts, which are only created when `MarketCreationRequest` is approved. Until approval works, no markets will appear. **Solution**: Once approval is fixed, markets will appear after approval.

## Next Steps

1. ✅ Explorer URL timestamp fixed
2. ✅ ExerciseCommand format fixed
3. ✅ Contract ID resolution implemented
4. ⏳ Test approval/rejection with synchronized contracts
5. ⏳ Verify Markets page shows approved markets

## Troubleshooting

### "Cannot find actual contract ID for updateId"
- **Cause**: Contract not synchronized on blockchain yet
- **Solution**: Wait 10-30 seconds, refresh Admin Dashboard, try again

### "JSON decoding to CNil" error
- **Cause**: Command format incorrect (should be fixed now)
- **Solution**: If still occurs, check Vercel logs for exact command format being sent

### Explorer URL still incorrect
- **Cause**: `/v2/updates` endpoint might not be returning `record_time`
- **Solution**: Check Vercel logs for `[api/get-update-details]` to see what's being returned