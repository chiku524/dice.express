# Why Query Endpoints Are Unavailable

## The Issue

The Admin and Markets pages show this message:
```
Query Endpoints Unavailable
The Canton query endpoints are not currently available (returning 404 errors).
```

## What This Means

**Query endpoints** are HTTP endpoints that allow you to search and retrieve contracts from the Canton ledger. They are different from **command endpoints** (which create contracts).

- ✅ **Command endpoints work**: `/v2/commands/submit-and-wait` - You can create contracts
- ❌ **Query endpoints don't work**: `/v2/query`, `/v1/query` - Return 404 errors

## Why This Happens

### For Managed Devnets (Your Situation)

You're using a **managed Canton devnet** (`participant.dev.canton.wolfedgelabs.com`). In managed environments:

1. **The infrastructure provider controls what endpoints are exposed**
2. **Query endpoints are optional** - they're not enabled by default
3. **Only the Canton administrator can enable them** - This requires:
   - Access to the Canton participant configuration
   - Modifying the participant's HTTP API settings
   - Restarting or reconfiguring the participant

### This Is NOT Fixable Through:
- ❌ **Code changes** - The endpoints simply don't exist (404)
- ❌ **Package vetting** - Vetting only affects package availability, not API endpoints
- ❌ **Different request formats** - We've tried many variations, all return 404
- ❌ **Workarounds** - There's no alternative way to query contracts via the JSON API

## What CAN Be Done

### Option 1: Request Endpoint Enablement (Recommended)
**Contact your Canton administrator** and ask them to:

1. Enable JSON API query endpoints on the participant
2. The endpoints should be available at:
   - `/json-api/v2/query`
   - `/json-api/v1/query`
   - Or similar query endpoints

**What to say:**
> "Can you enable JSON API query endpoints on the Canton participant? 
> The endpoints `/json-api/v2/query` and `/json-api/v1/query` are returning 404 errors.
> We need these to query contracts for our frontend application."

### Option 2: Use Block Explorer (Current Workaround)
**URL**: https://devnet.ccexplorer.io/

**What you can do:**
- View all contracts created
- Search by contract ID
- View contract state and history
- Search by party ID to see all contracts for a party

**Limitation**: This is read-only and manual - not suitable for real-time UI updates.

### Option 3: Store Contract IDs Locally
When creating contracts, we get contract IDs in the response. We could:
1. Store contract IDs in browser localStorage after creation
2. Display those contracts in the UI
3. Fetch contract details using other methods (if available)

**Limitation**: Only shows contracts we created, not all contracts on the ledger.

## Technical Details

### For Self-Hosted Canton
If you were running your own Canton participant, you could enable query endpoints via configuration:

```hocon
canton.participants.participant1.http-ledger-api {
  server.port = 7575
  query-endpoints.enabled = true
}
```

### For Managed Devnet
The infrastructure provider controls:
- Which endpoints are exposed
- Which features are enabled
- Network configuration
- Security settings

**This is by design** - managed services limit what's exposed for security and resource management.

## Current Status

### What Works ✅
- Creating contracts (commands)
- Viewing contracts in block explorer
- Package deployment
- Contract creation with proper IDs

### What Doesn't Work ❌
- Querying contracts via JSON API
- Displaying markets in Admin/Markets pages automatically
- Real-time contract listing

### Workarounds 🔄
- Use block explorer to verify contracts
- Store contract IDs after creation
- Wait for query endpoints to be enabled

## Next Steps

1. **Contact Canton administrator** to request query endpoint enablement
2. **Use block explorer** in the meantime to verify contracts exist
3. **Once enabled**, markets will automatically appear in Admin/Markets pages

## Verification

To verify if query endpoints are enabled (after administrator enables them):

```bash
curl -X POST https://participant.dev.canton.wolfedgelabs.com/json-api/v2/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateIds": ["b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:Market"],
    "query": {}
  }'
```

If this returns **200 OK** (not 404), query endpoints are enabled!

---

## Summary

**Query endpoints are unavailable because they need to be enabled by the Canton administrator.** This is an infrastructure configuration issue, not a code issue. Package vetting, code changes, or different request formats cannot fix this - it requires administrator action on the Canton participant.

