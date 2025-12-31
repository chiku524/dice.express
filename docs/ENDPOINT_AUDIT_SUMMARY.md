# Endpoint Audit Summary

## Overview

This document summarizes the comprehensive audit and cleanup of all API endpoints to ensure they match the official OpenAPI documentation.

**OpenAPI Documentation**: https://participant.dev.canton.wolfedgelabs.com/json-api/docs/openapi

## Valid Endpoints (from OpenAPI)

### Command Endpoints ✅
- `/v2/commands/submit-and-wait` - Submit commands and wait for completion
- `/v2/commands/async/submit` - Submit commands asynchronously
- `/v2/commands/completions` - Query completions list
- `/v2/commands/submit-and-wait-for-transaction` - Submit and wait for transaction
- `/v2/commands/submit-and-wait-for-reassignment` - Submit reassignment commands

### Event Endpoints ✅
- `/v2/events/events-by-contract-id` - Get events by contract ID

### Version Endpoint ✅
- `/v2/version` - Get version details

## Invalid Endpoints (Removed)

The following endpoints were being used but **DO NOT EXIST** in the OpenAPI documentation:

- ❌ `/v1/query` - Does not exist
- ❌ `/v2/query` - Does not exist
- ❌ `/v1/command` - Does not exist
- ❌ `/v2/command` - Does not exist
- ❌ `/command` - Does not exist
- ❌ `/v1/parties/{party}` - Does not exist
- ❌ `/v2/parties/{party}` - Does not exist
- ❌ `/parties/{party}` - Does not exist
- ❌ `/v1/contracts/search` - Does not exist
- ❌ `/v2/contracts/search` - Does not exist

## Files Updated

### Backend API Files

1. **`api/command.js`**
   - **Before**: Tried `/v1/command`, `/command`, `/v2/command`, `/v2/commands/submit-and-wait`
   - **After**: Only uses `/v2/commands/submit-and-wait` ✅
   - **Changes**: Removed all non-existent endpoint attempts

2. **`api/party-status.js`**
   - **Before**: Tried `/v2/query` and party info endpoints
   - **After**: Removed query endpoint attempts, documented that party info endpoints don't exist
   - **Changes**: Updated to reflect that query endpoints are not available in JSON API

3. **`api/query.js`**
   - **Before**: Tried 9+ different endpoint variations
   - **After**: Immediately returns empty results (query endpoints don't exist)
   - **Changes**: Completely simplified - removed 300+ lines of unnecessary endpoint attempts

### Frontend Files

4. **`frontend/src/services/ledgerClient.js`**
   - **Before**: Referenced `/v1/query` and `/v1/command` for direct connections
   - **After**: Always uses proxy endpoints (`/api/query`, `/api/command`)
   - **Changes**: Removed references to non-existent endpoints

5. **`frontend/src/utils/healthCheck.js`**
   - **Before**: Used `/v1/query` for health checks
   - **After**: Uses `/v2/version` endpoint (which exists)
   - **Changes**: Updated to use valid endpoint

### Documentation Files

6. **`docs/API.md`**
   - **Before**: Documented `/v1/query` and `/v1/command` endpoints
   - **After**: Updated to reflect actual endpoints, notes that query endpoints don't exist
   - **Changes**: Corrected endpoint documentation

7. **`docs/CANTON_ENDPOINTS_UPDATE.md`**
   - **Before**: Listed non-existent endpoints
   - **After**: Lists only valid endpoints with ✅/❌ indicators
   - **Changes**: Updated endpoint list to match OpenAPI docs

## Removed Files

- **`frontend/src/hooks/useWallet.js`** - Unused (replaced by `WalletContext`)

## Key Findings

1. **Query Endpoints Don't Exist**: The JSON API does not provide contract query endpoints. Contract querying requires:
   - gRPC Ledger API
   - WebSocket connections
   - Local contract storage (which we implemented)

2. **Command Endpoint**: Only `/v2/commands/submit-and-wait` exists for command submission. All other command endpoint variations don't exist.

3. **No Party Info Endpoints**: Party information endpoints don't exist in JSON API. Use gRPC UserManagementService instead.

## Impact

### Positive
- ✅ All endpoints now match OpenAPI documentation
- ✅ No more attempts to call non-existent endpoints
- ✅ Cleaner, simpler code
- ✅ Better error messages
- ✅ Reduced code complexity (removed 300+ lines from query.js)

### Expected Behavior
- Query operations return empty results with `_endpointsUnavailable: true` flag
- Frontend gracefully handles unavailable query endpoints
- Contract creation works correctly using `/v2/commands/submit-and-wait`
- Contract history uses local storage instead of query endpoints

## Verification

All endpoints have been verified against the OpenAPI documentation:
- ✅ Command endpoints match
- ✅ Event endpoints match
- ✅ Version endpoint matches
- ✅ No invalid endpoints remain in codebase

## References

- OpenAPI Documentation: https://participant.dev.canton.wolfedgelabs.com/json-api/docs/openapi
- Client Confirmation: "/v1/query does not exist in json-api"

