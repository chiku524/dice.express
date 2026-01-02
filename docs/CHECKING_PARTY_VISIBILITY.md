# How to Check Party Visibility for Contracts

## Understanding Party Visibility

In Canton/DAML, contracts are only visible to parties that are:
1. **Signatories** - Parties that must sign/approve the contract
2. **Observers** - Parties explicitly granted read access

## For MarketCreationRequest Contracts

Looking at the DAML template:

```daml
template MarketCreationRequest
  with
    creator : Party
    admin : Party
    ...
  where
    signatory creator, admin
```

**Both `creator` and `admin` are signatories**, which means:
- ✅ Both parties can see the contract
- ✅ Both parties can query it via `/v2/state/active-contracts`
- ✅ The contract is visible to both parties

## How to Verify Party Visibility

### 1. Check the Explorer

1. Go to the explorer link from contract creation
2. Look at the `verdict` section
3. Check `submitting_parties` - this shows which parties submitted the transaction
4. Check `informees` in `transaction_views` - these are parties that can see the transaction

Example from your explorer JSON:
```json
{
  "submitting_parties": [
    "ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292"
  ],
  "transaction_views": {
    "views": [{
      "informees": [
        "ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292",
        "wolfedgelabs-dev-0::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292"
      ]
    }]
  }
}
```

**Your party ID** is in the `informees` list, which means it should have visibility.

### 2. Check the Contract Payload

When you query contracts, check that:
- `payload.admin` matches your wallet party
- `payload.creator` matches your wallet party

If both match, the contract should be visible.

### 3. Query Directly via Explorer

1. Go to [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. Search for your party ID: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
3. This should show all contracts visible to your party
4. Look for `MarketCreationRequest` contracts

### 4. Check Browser Console Logs

When querying, check the logs for:
- `[api/query] Filter party:` - Should match your wallet party
- `[api/query] Total contracts returned:` - Should be > 0 if contracts exist
- `[api/query] Contract details:` - Shows admin/creator fields

## Common Issues

### Issue 1: Token Expired (401 Error)
**Symptom**: `401 Authentication failed` in logs

**Solution**:
1. Go to Wallet modal
2. Get a new token
3. Save it
4. Retry the query

### Issue 2: Wrong Party ID
**Symptom**: Contracts exist but not visible

**Solution**:
- Verify the party ID in your wallet matches the party ID used to create the contract
- Check that `payload.admin` matches your wallet party

### Issue 3: Template ID Mismatch
**Symptom**: No contracts found even though they exist

**Solution**:
- Verify template ID: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:MarketCreationRequest`
- Check that the package is deployed correctly

### Issue 4: Synchronization Delay
**Symptom**: Contract created but not visible in queries

**Solution**:
- Wait 30+ seconds after contract creation
- Contracts with `updateId` are asynchronous and need time to sync
- The Admin Dashboard now retries up to 5 times with increasing delays

## Testing Party Visibility

You can test if your party has visibility by:

1. **Creating a contract** with your party as both `creator` and `admin`
2. **Querying immediately** - should work since you're a signatory
3. **Checking explorer** - your party should be in `informees`
4. **Querying after delay** - should still work after sync

## Your Current Situation

Based on your logs:
- ✅ Party ID is correct: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
- ✅ Template ID is correct: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:MarketCreationRequest`
- ❌ **401 Authentication Error** - Token is expired
- ⚠️ Contract exists (explorer shows update) but details not visible (normal for async)

**Next Steps**:
1. Refresh your token in the Wallet modal
2. Wait 30+ seconds after contract creation
3. Check Admin Dashboard again
4. Check browser console for detailed logs