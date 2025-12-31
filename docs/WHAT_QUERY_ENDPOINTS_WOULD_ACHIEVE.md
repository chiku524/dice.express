# What Query Endpoints Would Achieve

## The Core Functionality Needed

Query endpoints would allow the app to **retrieve contracts from the ledger** based on:
1. **Template ID** - Find all contracts of a specific type
2. **Query filters** - Filter contracts by their data fields
3. **Party filters** - Find contracts where a specific party is involved

## Specific Use Cases in Our App

### 1. MarketsList.jsx - List All Markets

**What we're trying to do:**
```javascript
// Find all Market contracts
const markets = await ledger.query(
  ['b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:Market'],
  {},  // No filters - get all markets
  { forceRefresh: true }
)
```

**What this would achieve:**
- Display a list of all approved markets
- Show market titles, descriptions, status
- Allow users to browse and discover markets
- Enable clicking on markets to view details

**What we need:**
- Endpoint that accepts: `templateIds: ["packageId:module:template"]`
- Returns: Array of contracts matching that template
- Format: `[{ contractId: "...", payload: { title: "...", ... } }, ...]`

### 2. AdminDashboard.jsx - List Pending Requests

**What we're trying to do:**
```javascript
// Find all MarketCreationRequest contracts where admin = my party
const requests = await ledger.query(
  ['b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:MarketCreationRequest'],
  { admin: wallet.party },  // Filter: only requests where I'm the admin
  { forceRefresh: true }
)
```

**What this would achieve:**
- Show all pending market creation requests
- Filter to only show requests where current user is admin
- Display request details (title, description, creator)
- Allow admin to approve/reject requests

**What we need:**
- Endpoint that accepts: `templateIds` + `query` filters
- Filter by contract data fields (e.g., `{ admin: "party123" }`)
- Returns: Filtered array of contracts

### 3. Portfolio.jsx - List User's Positions

**What we're trying to do:**
```javascript
// Find all Position contracts where owner = my party
const positions = await ledger.query(
  ['b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:Position'],
  { owner: wallet.party }  // Filter: only my positions
)
```

**What this would achieve:**
- Show user's active trading positions
- Display position details (market, outcome, quantity)
- Calculate portfolio value
- Show profit/loss

**What we need:**
- Endpoint that accepts: `templateIds` + `query` filters
- Filter by contract data fields (e.g., `{ owner: "party123" }`)
- Returns: Filtered array of contracts

## What Query Endpoints Would Provide

### Basic Query Operation

**Input:**
```json
{
  "templateIds": [
    "b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:Market"
  ],
  "query": {}  // Optional filters
}
```

**Output:**
```json
{
  "result": [
    {
      "contractId": "00abc123...",
      "payload": {
        "title": "Will Bitcoin reach $100k?",
        "description": "...",
        "status": "Active",
        "marketId": "market-123",
        ...
      }
    },
    {
      "contractId": "00def456...",
      "payload": {
        "title": "Will Ethereum reach $5k?",
        ...
      }
    }
  ]
}
```

### Filtered Query Operation

**Input:**
```json
{
  "templateIds": [
    "b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:MarketCreationRequest"
  ],
  "query": {
    "admin": "ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292"
  }
}
```

**Output:**
```json
{
  "result": [
    {
      "contractId": "00xyz789...",
      "payload": {
        "title": "New Market Request",
        "admin": "ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292",
        "creator": "party456",
        ...
      }
    }
  ]
}
```

## What to Look For in Canton Documentation

When asking your client about the endpoint, ask them to look for:

### 1. Contract Query/Retrieval Endpoints

**Keywords to search for:**
- "query contracts"
- "get contracts by template"
- "list contracts"
- "active contracts"
- "contract search"
- "filter contracts"

**What it should accept:**
- Template ID(s) - to specify which contract types to find
- Query filters - to filter by contract data fields
- Party filters - to filter by party involvement

**What it should return:**
- Array of contract objects
- Each contract should include: `contractId` and `payload` (contract data)

### 2. Event-Based Alternatives

**Keywords:**
- "events by template"
- "stream contracts"
- "active contracts stream"
- "contract events"

**Note:** The existing `/v2/events/events-by-contract-id` requires a contract ID, but we need one that accepts a template ID.

### 3. Command Completion Alternatives

**Keywords:**
- "command completions"
- "transaction queries"
- "active contracts from transactions"

**Note:** `/v2/commands/completions` exists but returns command completions, not contracts directly.

## Specific Questions for Your Client

Ask your client:

1. **"Is there an endpoint to get all active contracts of a specific template?"**
   - We need: `POST /v2/contracts/active` or similar
   - Input: `{ templateIds: ["packageId:module:template"] }`
   - Output: Array of contracts

2. **"Is there an endpoint to query contracts with filters?"**
   - We need: Ability to filter by contract data fields
   - Example: Find all `MarketCreationRequest` where `admin = "party123"`

3. **"Is there a WebSocket endpoint for streaming contracts?"**
   - We need: Real-time updates when contracts are created
   - Example: `wss://.../v2/stream/contracts?templateIds=...`

4. **"Does the gRPC API have contract querying that we can access via HTTP?"**
   - We need: HTTP wrapper for gRPC contract queries
   - Or: Instructions on how to use gRPC from JavaScript

## What We Currently Have vs. What We Need

### ✅ What We Have (Works)

| Endpoint | Purpose | Limitation |
|----------|---------|------------|
| `/v2/commands/submit-and-wait` | Create contracts | Only for creating, not querying |
| `/v2/events/events-by-contract-id` | Get events for a contract | Requires contract ID (we don't have it) |

### ❌ What We Need (Missing)

| Functionality | What We Need |
|---------------|--------------|
| List all Market contracts | Endpoint that accepts template ID, returns all matching contracts |
| Filter MarketCreationRequest by admin | Endpoint that accepts template ID + query filters |
| List user's Position contracts | Endpoint that accepts template ID + party filter |

## Summary for Your Client

**What query endpoints would achieve:**

1. **List contracts by template** - Find all contracts of a specific type (e.g., all Market contracts)
2. **Filter contracts by data** - Find contracts matching specific criteria (e.g., `admin = "party123"`)
3. **Real-time contract discovery** - Show contracts created by others, not just ourselves

**What to look for in Canton docs:**

- Endpoint that accepts `templateIds` and returns contracts
- Endpoint that supports query filters on contract data
- Alternative: WebSocket endpoint for streaming contracts
- Alternative: HTTP wrapper for gRPC contract queries

**Current limitation:**

- We can only view contracts if we already know the contract ID
- We can't discover contracts we didn't create
- We can't filter contracts by their data fields

**The endpoint we need would:**

- Accept: `{ templateIds: ["..."], query: { field: "value" } }`
- Return: `{ result: [{ contractId: "...", payload: {...} }, ...] }`

This would enable:
- ✅ Markets page showing all markets
- ✅ Admin dashboard showing pending requests
- ✅ Portfolio showing user's positions
