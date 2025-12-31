# Where Did "Query Endpoints" Come From?

## The Honest Answer

**"Query endpoints" is NOT an official Canton term.** It's a term I've been using based on:

1. **Assumptions from other blockchain APIs** - Many blockchain APIs have "query" endpoints
2. **The app's design** - The app was built expecting to query contracts
3. **Common API patterns** - REST APIs often have query/search endpoints

## What Canton Actually Has

Looking at the [Canton JSON API OpenAPI documentation](https://participant.dev.canton.wolfedgelabs.com/json-api/docs/openapi), there are:

- ✅ **Command endpoints** (`/v2/commands/submit-and-wait`) - For creating contracts
- ✅ **Event endpoints** (`/v2/events/events-by-contract-id`) - For getting events by contract ID
- ❌ **NO general query/search endpoints** - Nothing to list contracts by template

## Where I Got the Term From

### 1. Other Blockchain APIs

Many blockchain APIs use "query" terminology:
- **Provenance Blockchain**: Has "query endpoints" for retrieving blockchain data
- **Amazon Managed Blockchain**: Has query APIs like `GetTokenBalance`, `GetTransaction`
- **Ethereum JSON-RPC**: Has query methods like `eth_getBalance`, `eth_call`

**But Canton JSON API is different** - it doesn't follow this pattern.

### 2. DAML Ledger API (gRPC)

Canton's **gRPC Ledger API** (not JSON API) has query capabilities:
- `GetActiveContracts` - Query active contracts
- `GetContractsByKey` - Query contracts by key
- `GetTransactionTrees` - Query transactions

**But these are gRPC, not HTTP JSON endpoints.**

### 3. The App's Design

The app was designed with pages that need to list contracts:
- MarketsList - needs to list all Market contracts
- AdminDashboard - needs to list MarketCreationRequest contracts
- Portfolio - needs to list Position contracts

**I assumed** there would be endpoints to support this, similar to other blockchain APIs.

## The Problem

I've been using the term "query endpoints" as if:
1. They're a standard Canton feature
2. They should exist in JSON API
3. They're necessary for the app

**But none of this is true:**
- ❌ They're not in the OpenAPI documentation
- ❌ They're not a standard Canton JSON API feature
- ❌ They're only "necessary" if we keep the current app design

## What Canton Actually Calls It

Looking at Canton documentation, they use:
- **"Command submission"** - For creating contracts (what we have)
- **"Event queries"** - For getting events by contract ID (what we have)
- **"Contract queries"** - For gRPC API, not JSON API

**Canton doesn't call them "query endpoints" in the JSON API context** - because they don't exist in JSON API!

## Why I Insisted They're Necessary

I've been saying query endpoints are "necessary" because:

1. **The app design assumes them** - MarketsList, AdminDashboard, Portfolio all try to query contracts
2. **Standard UX expectations** - Users expect to see lists of markets, positions, etc.
3. **Other blockchain APIs have them** - I assumed Canton would too

**But this is circular reasoning:**
- The app needs them → because the app was designed to use them
- They're necessary → because the app needs them

## The Real Question

**Should the app have been designed this way?**

Maybe not. Maybe the app should:
- Only show contracts the user created (stored locally)
- Require contract IDs for navigation
- Not have "browse all markets" functionality

**In that case, query endpoints wouldn't be necessary at all.**

## What We Should Actually Say

Instead of "query endpoints are necessary," we should say:

> "The app was designed to list contracts, which requires querying the ledger. Canton JSON API doesn't provide contract querying endpoints. We have two options:
> 
> 1. **Redesign the app** to work without querying (only show locally stored contracts)
> 2. **Use gRPC/WebSocket APIs** for contract querying (different implementation)"

## Conclusion

**"Query endpoints" is a term I've been using, not an official Canton term.**

- ❌ Not in Canton JSON API OpenAPI documentation
- ❌ Not a standard Canton feature
- ✅ Exists in other blockchain APIs (but Canton is different)
- ✅ Exists in Canton's gRPC API (but not JSON API)

**They're only "necessary" if we keep the current app design.** If we redesign the app to work without querying, they're not necessary at all.

## References

- [Canton JSON API OpenAPI Docs](https://participant.dev.canton.wolfedgelabs.com/json-api/docs/openapi) - No query endpoints listed
- [Canton Documentation](https://docs.daml.com/canton/index.html) - Uses gRPC for queries, not JSON API
- Other blockchain APIs use "query endpoints" but Canton JSON API doesn't follow this pattern
