# Query Endpoints: Can We Enable Them Programmatically?

## Short Answer

**For a managed Canton devnet**: Query endpoints typically need to be enabled by the infrastructure provider (Canton administrator). However, we can try several programmatic approaches first.

## What We've Tried Programmatically

### 1. Multiple Endpoint Variations
We're now trying:
- POST `/v2/query`, `/v1/query`, `/query`
- POST `/v2/contracts/search`, `/v1/contracts/search`
- GET `/v2/contracts`, `/v1/contracts`, `/contracts`
- POST `/v2/contracts/query`, `/v1/contracts/query`

### 2. Multiple Request Formats
- With full package IDs: `packageId:module:template`
- Without package IDs: `module:template`
- Different Content-Type headers
- Both GET and POST methods

### 3. Alternative Endpoints That Work
- ✅ `/v2/packages` (GET) - Works! We can list packages
- ✅ `/v2/commands/submit-and-wait` (POST) - Works! We can create contracts

## The Reality

### For Self-Hosted Canton
Query endpoints can be enabled via configuration:
```hocon
canton.participants.participant1.http-ledger-api.server.port = 7575
```

### For Managed Devnet
Since you're using `participant.dev.canton.wolfedgelabs.com` (a managed devnet), the infrastructure provider controls:
- Which endpoints are exposed
- Which features are enabled
- Network configuration

**This typically requires the Canton administrator to enable query endpoints.**

## Alternative Solutions

### Option 1: Use Block Explorer (Current Workaround)
**URL**: https://devnet.ccexplorer.io/

**What you can do:**
- View all contracts created
- Search by contract ID
- View contract state and history
- Search by party ID to see all contracts for a party

**Limitation**: This is read-only and manual - not suitable for real-time UI updates.

### Option 2: Store Contract IDs After Creation
When creating contracts, we get contract IDs in the response. We could:
1. Store contract IDs in a database/cache after creation
2. Use those IDs to fetch contract details via other endpoints
3. Display them in the UI

**Limitation**: Only shows contracts we created, not all contracts on the ledger.

### Option 3: Use Command API to Fetch Contracts
Some Canton setups allow fetching contracts via the command API using specific commands. However, this would require:
- Specific DAML choices that return contract data
- Or admin API access

**Status**: Not currently available in our setup.

### Option 4: Request Query Endpoint Enablement
**Recommended approach**: Contact the Canton administrator to enable query endpoints.

**What to ask:**
- "Can you enable JSON API query endpoints on the participant?"
- "The endpoints `/json-api/v2/query` and `/json-api/v1/query` are returning 404"
- "We need these to query contracts for our frontend application"

## What We've Implemented

### Enhanced Query Handler
The query API now tries:
- ✅ Multiple endpoint paths
- ✅ Both GET and POST methods
- ✅ Multiple request body formats
- ✅ Different Content-Type headers
- ✅ With and without package IDs

### Graceful Degradation
- Shows helpful error messages when query endpoints aren't available
- Explains that markets exist but can't be displayed
- Provides guidance on enabling endpoints

## Next Steps

1. **Test the enhanced query handler** - It will try more variations automatically
2. **Check logs** - See which endpoints are being tried and what responses we get
3. **Contact administrator** - If all endpoints still return 404, request enablement
4. **Use block explorer** - As a temporary workaround to verify contracts exist

## Verification

To verify if query endpoints are enabled:
```bash
# Try querying directly
curl -X POST https://participant.dev.canton.wolfedgelabs.com/json-api/v2/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateIds": ["b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:Market"],
    "query": {}
  }'
```

If this returns 200 (not 404), query endpoints are enabled!

