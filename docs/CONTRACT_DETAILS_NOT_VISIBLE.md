# Why Contract Details Aren't Visible in Explorer

## The Issue

When viewing a transaction in the Canton Devnet Explorer, you see:
- ✅ The transaction exists
- ✅ The update was accepted (`VERDICT_RESULT_ACCEPTED`)
- ❌ But `"update": null` - no contract details visible

## Why This Happens

### 1. Async Submission Format

When contracts are created with `/v2/commands/submit-and-wait`, Canton returns:
```json
{
  "updateId": "12200910e42e22c45bc5bff9d2838167b392b42915e34c263854336b43023be78a18",
  "completionOffset": 408307
}
```

**This is an async submission** - the contract is being processed but not yet fully synchronized.

### 2. Explorer Shows Update Verdict, Not Contract Details

The explorer URL format is:
```
/updates/{updateId}/{record_time}
```

This shows the **update verdict** (whether the transaction was accepted), not the contract details themselves.

The update verdict shows:
- ✅ Transaction was accepted
- ✅ Parties involved
- ✅ Timestamps
- ❌ But NOT the contract payload (title, description, etc.)

### 3. Contract Details Are Stored Separately

Contract details are stored in the **ledger state**, not in the update verdict. To see contract details:

1. **Wait for synchronization** (30+ seconds)
2. **Query the contract** via `/v2/state/active-contracts`
3. **Or search by contract ID** in the explorer

## How to Verify Contract Was Created Correctly

### Method 1: Check the Request Payload

Look at the Vercel logs when creating a contract. You should see:
```
[api/command] CreateArguments being sent: {
  "creator": "...",
  "admin": "...",
  "title": "Your Market Title",
  "description": "Your Market Description",
  ...
}
```

If all fields are present, the contract is being created with the correct data.

### Method 2: Query Active Contracts

After waiting 30+ seconds, query `/v2/state/active-contracts`:
- If the contract appears, it was created correctly
- The payload will show all the fields (title, description, etc.)

### Method 3: Search Explorer by Party

1. Go to [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. Search for your party ID
3. Look for `MarketCreationRequest` contracts
4. Click on a contract to see its details

## Why Explorer Shows "update: null"

The `"update": null` in the explorer JSON is **normal** for async submissions. It means:
- ✅ The transaction was accepted
- ✅ The contract will be created
- ⚠️ But the contract details aren't in the update verdict itself

The contract details are stored in the ledger state and will be visible once:
1. The contract is fully synchronized
2. You query it via `/v2/state/active-contracts`
3. Or search for it in the explorer

## What to Check

### 1. Verify Payload is Being Sent

Check Vercel logs for:
```
[api/command] CreateArguments being sent: { ... }
[api/command] Fields in createArguments: ["creator", "admin", "title", "description", ...]
```

All fields should be present.

### 2. Check for Errors

Look for any errors in the creation response:
- ❌ Validation errors
- ❌ Missing required fields
- ❌ Type mismatches

### 3. Wait and Query

After creating a contract:
1. Wait 30+ seconds
2. Check Admin Dashboard (it will retry automatically)
3. Or manually query `/v2/state/active-contracts`

## Expected Behavior

1. **Immediately after creation**: Explorer shows update verdict (no contract details)
2. **After 30+ seconds**: Contract should appear in `/v2/state/active-contracts` queries
3. **Contract details**: Will be visible when querying, not in the update verdict

## Conclusion

**The `"update": null` is normal** - it doesn't mean the contract wasn't created. The contract details are stored separately in the ledger state and will be visible once synchronized.

To verify the contract was created correctly:
1. Check the request payload logs
2. Wait 30+ seconds
3. Query `/v2/state/active-contracts`
4. Or search the explorer by party ID