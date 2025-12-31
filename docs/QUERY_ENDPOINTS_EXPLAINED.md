# Query Endpoints Explained

## What Are Query Endpoints?

**Query endpoints** are HTTP endpoints that allow you to **search and retrieve contracts** from the Canton ledger based on:
- **Template ID** (e.g., "find all Market contracts")
- **Query filters** (e.g., "find all Market contracts where status = 'Active'")
- **Party filters** (e.g., "find all contracts where owner = 'party123'")

### Example Use Cases in Our App

1. **Markets Page**: "Show me all `Market` contracts that are approved"
2. **Admin Dashboard**: "Show me all `MarketCreationRequest` contracts where admin = my party"
3. **Portfolio**: "Show me all `Position` contracts where owner = my party"

### What We're Trying to Do

```javascript
// This is what we want to do:
const markets = await ledger.query(
  ['b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:Market'],
  { status: 'Active' }  // Filter: only active markets
)
// Returns: [{ contractId: '...', payload: { title: '...', ... } }, ...]
```

## Why Are They Necessary?

Query endpoints are necessary because:

1. **Listing Contracts**: You need to find contracts without knowing their contract IDs
2. **Filtering**: You need to filter contracts by their data (e.g., "show only active markets")
3. **Real-time Updates**: You need to refresh lists when new contracts are created
4. **User Experience**: Users expect to see lists of markets, positions, etc.

### Without Query Endpoints

- ❌ Can't list all markets on the Markets page
- ❌ Can't show pending requests on Admin Dashboard
- ❌ Can't display user's portfolio positions
- ✅ Can still create contracts (command endpoints work)
- ✅ Can view specific contracts if you know the contract ID

## What Endpoints Exist in JSON API?

Based on the [OpenAPI documentation](https://participant.dev.canton.wolfedgelabs.com/json-api/docs/openapi), here are the **actual available endpoints**:

### ✅ Command Endpoints (Work - We Use These)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/v2/commands/submit-and-wait` | Create contracts, exercise choices | ✅ **Works** |
| `/v2/commands/async/submit` | Submit commands asynchronously | ✅ **Works** |
| `/v2/commands/completions` | Query command completions (not contracts) | ✅ **Works** |

### ❌ Query Endpoints (Don't Exist)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/v1/query` | Query contracts by template | ❌ **Does NOT exist** |
| `/v2/query` | Query contracts by template | ❌ **Does NOT exist** |
| `/v1/contracts/search` | Search contracts | ❌ **Does NOT exist** |
| `/v2/contracts/search` | Search contracts | ❌ **Does NOT exist** |

### ⚠️ Event Endpoint (Limited Use)

| Endpoint | Purpose | Limitation |
|----------|---------|------------|
| `/v2/events/events-by-contract-id` | Get events for a contract | ❌ **Requires contract ID** - Can't use to find contracts |

## Why Don't Query Endpoints Exist?

This is **by design** in the Canton JSON API:

1. **JSON API is Command-Focused**: It's designed for submitting commands (creating contracts, exercising choices), not querying
2. **Querying is Resource-Intensive**: Querying all contracts can be expensive and slow
3. **Alternative APIs Exist**: Canton provides gRPC API and WebSocket APIs for querying
4. **Security**: Limiting query endpoints reduces attack surface

## Are There Alternatives in JSON API?

### Option 1: `/v2/events/events-by-contract-id` ❌ Not Suitable

**Why it doesn't work:**
- Requires you to **already know the contract ID**
- Can't search for contracts by template
- Can't filter contracts by their data

**Example:**
```javascript
// This works, but you need the contract ID first:
const events = await fetch('/v2/events/events-by-contract-id', {
  method: 'POST',
  body: JSON.stringify({ contractId: '00abc123...' })  // Need ID first!
})
```

**Problem**: How do you get the contract ID if you don't know it? You'd need query endpoints for that!

### Option 2: `/v2/commands/completions` ❌ Not Suitable

**Why it doesn't work:**
- Returns **command completions**, not contracts
- Shows what commands completed, not what contracts exist
- Can't filter by contract template or data

### Option 3: Command Responses ✅ We Already Use This

**What we do:**
- When creating a contract, we get the contract ID in the response
- We store it locally in `localStorage`
- We display it in the History page

**Limitation**: Only shows contracts **we created**, not all contracts on the ledger

## Real Alternatives (Outside JSON API)

### Option 1: gRPC API ✅ Best Option

Canton provides a **gRPC API** that supports contract querying:

```javascript
// Example (pseudo-code - would need gRPC client)
const contracts = await grpcClient.queryContracts({
  filter: {
    templateIds: ['PredictionMarkets:Market'],
    query: { status: 'Active' }
  }
})
```

**Pros:**
- ✅ Full query support
- ✅ Efficient for large result sets
- ✅ Real-time updates possible

**Cons:**
- ❌ Requires different client library (gRPC, not HTTP)
- ❌ More complex to implement
- ❌ May require different authentication

### Option 2: WebSocket API ✅ Good Option

Canton supports WebSocket connections for real-time contract queries:

```javascript
// Example (pseudo-code)
const ws = new WebSocket('wss://participant.dev.canton.wolfedgelabs.com/ws')
ws.send(JSON.stringify({
  type: 'query',
  templateIds: ['PredictionMarkets:Market'],
  query: { status: 'Active' }
}))
```

**Pros:**
- ✅ Real-time updates
- ✅ Efficient for streaming results
- ✅ Can handle large result sets

**Cons:**
- ❌ More complex to implement
- ❌ Requires WebSocket connection management
- ❌ May require different authentication

### Option 3: Block Explorer ✅ Current Workaround

**URL**: https://devnet.ccexplorer.io/

**What you can do:**
- View all contracts
- Search by contract ID
- Search by party ID
- View contract state

**Limitation**: 
- ❌ Read-only, manual
- ❌ Not suitable for real-time UI updates
- ❌ Can't be integrated into our app automatically

## Current Workaround in Our App

### What We Do Now

1. **Store Contract IDs Locally**: When creating contracts, we store the contract ID in `localStorage`
2. **History Page**: Shows contracts we've created
3. **Block Explorer Links**: Direct links to view contracts on explorer
4. **Informational Messages**: Explain that query endpoints don't exist

### Code Example

```javascript
// In CreateMarket.jsx - we store contract ID after creation
if (contractId) {
  ContractStorage.storeContract(
    contractId,
    templateId,
    { title, description, ... },
    wallet.party
  )
}

// In ContractHistory.jsx - we display stored contracts
const contracts = ContractStorage.getContracts()
```

## Summary

| Question | Answer |
|----------|--------|
| **What are query endpoints?** | HTTP endpoints to search/retrieve contracts by template/filter |
| **Why are they necessary?** | To list markets, positions, requests without knowing contract IDs |
| **Do they exist in JSON API?** | ❌ No - they don't exist per OpenAPI documentation |
| **Is there an alternative in JSON API?** | ❌ No - `/v2/events/events-by-contract-id` requires contract ID first |
| **What are real alternatives?** | ✅ gRPC API, ✅ WebSocket API, ✅ Block Explorer (manual) |
| **What should we do?** | Use gRPC/WebSocket for queries, or wait for query endpoints to be enabled |

## Next Steps

1. **Short-term**: Continue using local storage + block explorer
2. **Medium-term**: Consider implementing gRPC or WebSocket client for queries
3. **Long-term**: Request Canton administrator to enable query endpoints in JSON API (if possible)

## References

- [Canton JSON API OpenAPI Docs](https://participant.dev.canton.wolfedgelabs.com/json-api/docs/openapi)
- [Canton Documentation](https://docs.daml.com/canton/index.html)
- [Block Explorer](https://devnet.ccexplorer.io/)
