# Canton JSON API Query Endpoints Analysis

## Issue

The client reported that `/v1/query` endpoint does not exist in the Canton JSON API. We need to use the official OpenAPI documentation to identify the correct endpoints.

## OpenAPI Documentation

**Source**: https://participant.dev.canton.wolfedgelabs.com/json-api/docs/openapi

## Available Endpoints (from OpenAPI docs)

Based on the OpenAPI specification, the following endpoints are available:

### Command Endpoints
- `/v2/commands/submit-and-wait` - Submit commands and wait for completion
- `/v2/commands/async/submit` - Submit commands asynchronously
- `/v2/commands/completions` - Query completions list
- `/v2/commands/submit-and-wait-for-transaction` - Submit and wait for transaction
- `/v2/commands/submit-and-wait-for-reassignment` - Submit reassignment commands

### Event Endpoints
- `/v2/events/events-by-contract-id` - Get events by contract ID

### Version Endpoint
- `/v2/version` - Get version details

## Missing Query Endpoints

**Important Finding**: The OpenAPI documentation does **NOT** include:
- `/v1/query` ❌ (does not exist)
- `/v2/query` ❌ (does not exist)
- `/v1/contracts/search` ❌ (does not exist)
- `/v2/contracts/search` ❌ (does not exist)

## Current Implementation Issue

Our `api/query.js` file is trying to use endpoints that don't exist:
```javascript
const possibleEndpoints = [
  { url: `${baseUrl}/v2/query`, method: 'POST' },        // ❌ Does not exist
  { url: `${baseUrl}/v1/query`, method: 'POST' },        // ❌ Does not exist
  { url: `${baseUrl}/v2/contracts/search`, method: 'POST' }, // ❌ Does not exist
  // ... etc
]
```

## Possible Solutions

### Option 1: Use Command Completions Endpoint
The `/v2/commands/completions` endpoint might be used to query contract state, but it's designed for command completions, not contract queries.

### Option 2: Use Events Endpoint
The `/v2/events/events-by-contract-id` endpoint can get events for a specific contract, but requires knowing the contract ID first.

### Option 3: Query Endpoints May Not Be Available
Based on the OpenAPI docs, it appears that **query endpoints are not part of the JSON API**. Contract querying might need to be done through:
1. **gRPC API** (not JSON API)
2. **WebSocket connections** (mentioned in OpenAPI security schemes)
3. **Command-based approach** (submit commands to read contracts)

## Recommendation

1. **Contact the Canton administrator** to confirm:
   - Are query endpoints available through a different API (gRPC)?
   - Should we use WebSocket connections for real-time contract queries?
   - Is there a different endpoint format not documented in OpenAPI?

2. **Alternative Approach**: 
   - Use the contract storage system we implemented to track created contracts locally
   - Use command endpoints to create contracts (which we're already doing successfully)
   - For reading contracts, we may need to use gRPC or WebSocket APIs

3. **Update Code**:
   - Remove attempts to use non-existent `/v1/query` and `/v2/query` endpoints
   - Document that query endpoints are not available in JSON API
   - Update frontend to rely on contract storage and command responses

## Next Steps

1. ✅ Remove non-existent endpoint attempts from `api/query.js`
2. ✅ Update documentation to reflect actual available endpoints
3. ✅ Contact administrator about contract querying options
4. ✅ Consider implementing WebSocket-based contract queries if available

## References

- OpenAPI Docs: https://participant.dev.canton.wolfedgelabs.com/json-api/docs/openapi
- Client Feedback: `/v1/query` does not exist in JSON API

