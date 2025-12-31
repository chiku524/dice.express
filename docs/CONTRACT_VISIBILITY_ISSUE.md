# Contract Visibility Issue Analysis

## Problem

Contracts are being created successfully (returning `updateId` and `completionOffset`), but they are not appearing in the Admin Dashboard when querying `/v2/state/active-contracts`.

## Observations

### Contract Creation Response
```json
{
  "updateId": "122017f98785af7ac97ea7942d507595a8d067085628e21bd9009f69bb8afc473ed8",
  "completionOffset": 408307
}
```

**Key Points:**
- ✅ Command was submitted successfully (200 OK)
- ⚠️ Response contains `updateId` instead of `contractId` (async submission)
- ⚠️ This means the contract is being processed asynchronously

### Query Response
```json
[]
```

**Key Points:**
- ✅ Endpoint is working (200 OK)
- ❌ Returns empty array (no contracts found)
- ⚠️ Query is using correct party and template ID

## Possible Causes

### 1. Synchronization Delay (Most Likely)
- Contracts created with `updateId` may take time to be processed
- The contract might not be visible immediately after creation
- **Solution**: Already implemented retry logic with increasing delays (3s, 5s, 10s)

### 2. Contract Not Actually Created
- The `updateId` response might mean the command is queued, not completed
- The contract might fail validation after submission
- **Solution**: Check the explorer link to verify contract exists

### 3. Visibility Issue
- The contract exists but the querying party doesn't have visibility
- Both `creator` and `admin` are signatories, so both should see it
- **Solution**: Verify party permissions and contract signatories

### 4. Offset Issue
- Using `activeAtOffset: 0` might miss recently created contracts
- The `completionOffset: 408307` might indicate we need to query from a later offset
- **Solution**: Try querying from the `completionOffset` or later

### 5. Contract Immediately Archived
- The contract was created but immediately archived (unlikely for MarketCreationRequest)
- **Solution**: Check if contract was archived via explorer

## Current Implementation

### Retry Logic
- ✅ AdminDashboard retries 3 times with delays: 3s, 5s, 10s
- ✅ Logs diagnostic information on each attempt
- ✅ Shows helpful warnings after all retries fail

### Query Logic
- ✅ Uses correct endpoint: `/v2/state/active-contracts`
- ✅ Uses correct filter format: `filtersByParty`
- ✅ Uses correct party: `wallet.party` (which matches `admin` field)
- ✅ Uses correct template ID
- ✅ Applies client-side filtering by `admin` field

## Next Steps to Debug

### 1. Verify Contract Exists
- Check the explorer link from market creation
- Verify the contract appears on the explorer
- Check if the contract has the expected `admin` field

### 2. Test with Different Offset
- Try querying from `completionOffset` instead of `0`
- Or try querying without offset (if supported)

### 3. Check Party Visibility
- Verify both `creator` and `admin` are signatories (they should be per DAML template)
- Check if the querying party matches the `admin` field in the contract

### 4. Wait Longer
- Contracts with `updateId` might take longer to synchronize
- Try waiting 30+ seconds and querying again

### 5. Check Explorer
- Use the explorer link to verify:
  - Contract exists
  - Contract has correct `admin` field
  - Contract is not archived
  - Contract is visible to the querying party

## Recommendations

1. **Verify on Explorer**: First, check if the contract actually exists on the explorer using the provided link
2. **Wait and Retry**: The retry logic should handle most synchronization delays
3. **Check Party Match**: Ensure the `admin` field in the contract matches the querying party
4. **Consider Alternative**: If contracts consistently don't appear, we might need to use a different approach (gRPC, WebSocket, or local storage tracking)

## Current Status

- ✅ Retry logic implemented
- ✅ Diagnostic logging added
- ⚠️ Contracts still not appearing after retries
- 🔍 Need to verify contract exists on explorer
- 🔍 Need to check if offset needs adjustment
