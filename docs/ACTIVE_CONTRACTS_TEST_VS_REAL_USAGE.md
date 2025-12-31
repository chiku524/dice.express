# Active Contracts Test vs Real App Usage

## Current Test Component

The `ActiveContractsTest` component tests the `/v2/state/active-contracts` endpoint **directly**, but this is **NOT exactly how it will be used in the real app**.

## How the Real App Uses It

### 1. MarketsList.jsx
```javascript
// Real usage:
const fetchedMarkets = await ledger.query(
  [`${PACKAGE_ID}:PredictionMarkets:Market`], 
  {},  // No filters - get all markets
  { forceRefresh: true }
)

// What it expects:
// Array of contracts: [{ contractId, payload: { title, description, ... } }, ...]
// Then displays: markets.map(m => <MarketCard market={m.payload} />)
```

### 2. AdminDashboard.jsx
```javascript
// Real usage:
const fetchedRequests = await ledger.query(
  [`${PACKAGE_ID}:PredictionMarkets:MarketCreationRequest`],
  { admin: wallet.party },  // Filter by contract data field
  { forceRefresh: true }
)

// What it expects:
// Array of contracts filtered where payload.admin === wallet.party
// Then displays: requests.map(r => <RequestCard request={r.payload} />)
```

### 3. Portfolio.jsx
```javascript
// Real usage:
const fetchedPositions = await ledger.query(
  [`${PACKAGE_ID}:PredictionMarkets:Position`],
  { owner: wallet.party }  // Filter by contract data field
)

// What it expects:
// Array of contracts filtered where payload.owner === wallet.party
// Then displays: positions.map(p => <PositionCard position={p.payload} />)
```

## The Problem

### `/v2/state/active-contracts` Endpoint Limitations

The endpoint uses `filtersByParty` which filters by **party visibility** (which party can see the contract), NOT by **contract data fields**.

**What the endpoint does:**
- `filtersByParty: { partyId: { inclusive: { templateIds: [...] } } }`
- Returns contracts that the specified party can see/access
- Does NOT filter by contract data fields like `admin`, `owner`, `creator`

**What we need:**
- Filter by contract data fields (`admin`, `owner`, `creator`)
- Get all contracts of a template (not just visible to one party)

## Current Implementation Issues

### Issue 1: MarketsList - No Party Filter
```javascript
// MarketsList calls:
ledger.query([templateId], {}, { forceRefresh: true })
// No party specified - wants ALL markets

// But endpoint requires:
filtersByParty: { partyId: { ... } }
// Must specify a party
```

**Solution Options:**
1. Use wallet party to get contracts visible to user
2. Get contracts from multiple parties (if possible)
3. Use a different approach (WebSocket, gRPC)

### Issue 2: AdminDashboard - Filter by Data Field
```javascript
// AdminDashboard calls:
ledger.query([templateId], { admin: wallet.party }, { forceRefresh: true })
// Wants contracts where payload.admin === wallet.party

// But endpoint only filters by:
filtersByParty: { partyId: { ... } }
// Can't filter by payload.admin
```

**Solution Options:**
1. Get all contracts visible to admin party, then filter client-side by `payload.admin`
2. Use a different endpoint that supports data field filtering
3. Use WebSocket/gRPC that supports more complex queries

### Issue 3: Portfolio - Filter by Data Field
```javascript
// Portfolio calls:
ledger.query([templateId], { owner: wallet.party }, { forceRefresh: true })
// Wants contracts where payload.owner === wallet.party

// But endpoint only filters by:
filtersByParty: { partyId: { ... } }
// Can't filter by payload.owner
```

**Solution Options:**
1. Get all contracts visible to user party, then filter client-side by `payload.owner`
2. Use a different endpoint that supports data field filtering
3. Use WebSocket/gRPC that supports more complex queries

## What the Test Actually Tests

The `ActiveContractsTest` component tests:
- ✅ Can we call the endpoint?
- ✅ Can we get contracts by template ID?
- ✅ Can we filter by party visibility?
- ❌ Does NOT test data field filtering (`admin`, `owner`)
- ❌ Does NOT test getting all contracts (no party filter)

## What We Need to Test

### Test 1: Can we get contracts visible to a party?
✅ **This is what the test does** - uses `filtersByParty`

### Test 2: Can we filter by contract data fields?
❌ **This is NOT tested** - endpoint doesn't support this directly
- Need to get contracts, then filter client-side
- Or find another endpoint that supports data field filtering

### Test 3: Can we get all contracts (no party filter)?
❌ **This is NOT tested** - endpoint requires a party
- Need to use wallet party or find another approach

## Recommended Testing Approach

### Step 1: Test Basic Functionality (Current Test)
- ✅ Test that endpoint works
- ✅ Test that we can get contracts by template
- ✅ Test that party filtering works

### Step 2: Test Real App Integration
Create integration tests that:

1. **Test MarketsList integration:**
   ```javascript
   // Test: Can MarketsList fetch and display markets?
   // - Call ledger.query() as MarketsList does
   // - Verify response format matches expectations
   // - Verify markets are displayed correctly
   ```

2. **Test AdminDashboard integration:**
   ```javascript
   // Test: Can AdminDashboard fetch requests filtered by admin?
   // - Call ledger.query() with { admin: party }
   // - Get all contracts visible to admin party
   // - Filter client-side by payload.admin === party
   // - Verify filtered results are correct
   ```

3. **Test Portfolio integration:**
   ```javascript
   // Test: Can Portfolio fetch positions filtered by owner?
   // - Call ledger.query() with { owner: party }
   // - Get all contracts visible to user party
   // - Filter client-side by payload.owner === party
   // - Verify filtered results are correct
   ```

## Implementation Changes Needed

### 1. Update `api/query.js` to Handle Data Field Filtering

```javascript
// After getting contracts from endpoint, filter by query filters
const contracts = await getContractsFromEndpoint(templateIds, party)
const filteredContracts = filterByDataFields(contracts, queryFilters)
// Where queryFilters = { admin: "...", owner: "...", etc. }
```

### 2. Handle No Party Filter Case

```javascript
// For MarketsList (no party filter):
// Option 1: Use wallet party (get contracts visible to user)
// Option 2: Get contracts from multiple parties (if possible)
// Option 3: Use a different approach
```

### 3. Client-Side Filtering

```javascript
// In api/query.js, after getting contracts:
if (queryFilters && Object.keys(queryFilters).length > 0) {
  // Filter by contract data fields
  transformedResults = transformedResults.filter(contract => {
    return Object.entries(queryFilters).every(([key, value]) => {
      return contract.payload[key] === value
    })
  })
}
```

## Conclusion

**The current test is a good start but does NOT fully replicate real app usage because:**

1. ❌ It doesn't test data field filtering (`admin`, `owner`)
2. ❌ It doesn't test the "no party filter" case (all markets)
3. ❌ It doesn't test the full integration path (ledger.query → api/query → endpoint)

**To truly test if it works for the app, we need to:**

1. ✅ Test that the endpoint works (current test does this)
2. ✅ Test that we can filter client-side by data fields
3. ✅ Test that MarketsList, AdminDashboard, and Portfolio work with real data
4. ✅ Test the full integration: component → ledgerClient → api/query → endpoint

The endpoint will work, but we'll need to add client-side filtering for data fields since the endpoint only filters by party visibility, not contract data.
