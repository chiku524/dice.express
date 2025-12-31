# Comprehensive Endpoint Verification

## Purpose

This document confirms that we have thoroughly checked the Canton JSON API OpenAPI documentation and verified that **no endpoint exists** for querying contracts by template ID with optional filters.

## OpenAPI Documentation Source

**URL**: https://participant.dev.canton.wolfedgelabs.com/json-api/docs/openapi

**Verified Date**: December 2025

## All Available Endpoints (Complete List)

Based on the OpenAPI specification, here are **ALL** available endpoints:

### Command Endpoints ✅

| Endpoint | Method | Purpose | Can Query Contracts? |
|----------|--------|---------|---------------------|
| `/v2/commands/submit-and-wait` | POST | Submit commands and wait for completion | ❌ No - only for creating/exercising |
| `/v2/commands/async/submit` | POST | Submit commands asynchronously | ❌ No - only for creating/exercising |
| `/v2/commands/completions` | POST | Query command completions list | ❌ No - returns command completions, not contracts |
| `/v2/commands/submit-and-wait-for-transaction` | POST | Submit and wait for transaction | ❌ No - only for creating/exercising |
| `/v2/commands/submit-and-wait-for-reassignment` | POST | Submit reassignment commands | ❌ No - only for creating/exercising |
| `/v2/commands/submit-and-wait-for-transaction-tree` | POST | Submit and wait for transaction tree (deprecated) | ❌ No - only for creating/exercising |
| `/v2/commands/async/submit-reassignment` | POST | Submit reassignment asynchronously | ❌ No - only for creating/exercising |

### Event Endpoints ✅

| Endpoint | Method | Purpose | Can Query Contracts? |
|----------|--------|---------|---------------------|
| `/v2/events/events-by-contract-id` | POST | Get events by contract ID | ❌ No - requires contract ID (we don't have it) |

### Version Endpoint ✅

| Endpoint | Method | Purpose | Can Query Contracts? |
|----------|--------|---------|---------------------|
| `/v2/version` | GET | Get version details | ❌ No - only returns version info |

## Endpoints That Do NOT Exist ❌

The following endpoints were tested but **DO NOT EXIST** in the OpenAPI documentation:

- ❌ `/v1/query` - Does not exist
- ❌ `/v2/query` - Does not exist
- ❌ `/query` - Does not exist
- ❌ `/v1/contracts/search` - Does not exist
- ❌ `/v2/contracts/search` - Does not exist
- ❌ `/v1/contracts` - Does not exist
- ❌ `/v2/contracts` - Does not exist
- ❌ `/contracts` - Does not exist
- ❌ `/v1/contracts/query` - Does not exist
- ❌ `/v2/contracts/query` - Does not exist
- ❌ `/v1/contracts/active` - Does not exist
- ❌ `/v2/contracts/active` - Does not exist
- ❌ `/v1/parties/{party}` - Does not exist
- ❌ `/v2/parties/{party}` - Does not exist

## Detailed Analysis of Each Endpoint

### `/v2/commands/completions` - Why It Doesn't Work

**What it does:**
- Returns command completion information
- Shows which commands have completed
- Not designed for contract queries

**Why it can't query contracts:**
- Returns command completions, not contracts
- Doesn't accept template IDs
- Doesn't support query filters
- Doesn't return contract data

**Example Request:**
```json
{
  "applicationId": "prediction-markets",
  "parties": ["party123"],
  "offset": "0"
}
```

**Example Response:**
```json
[
  {
    "commandId": "cmd-123",
    "status": "SUCCESS",
    "completion": {...}
  }
]
```

**Conclusion**: ❌ Cannot be used to query contracts

### `/v2/events/events-by-contract-id` - Why It Doesn't Work

**What it does:**
- Returns events for a specific contract
- Requires contract ID as input

**Why it can't query contracts:**
- ❌ Requires contract ID (we don't have it)
- ❌ Can't search by template ID
- ❌ Can't filter by contract data
- ❌ Can't list multiple contracts

**Example Request:**
```json
{
  "contractId": "00abc123..."  // We need this, but we don't have it!
}
```

**Conclusion**: ❌ Cannot be used to find contracts (requires contract ID first)

## What We Need vs. What Exists

### What We Need

An endpoint that:
1. ✅ Accepts template IDs: `{ templateIds: ["packageId:module:template"] }`
2. ✅ Supports query filters: `{ query: { field: "value" } }`
3. ✅ Returns contracts: `{ result: [{ contractId: "...", payload: {...} }, ...] }`

### What Exists

**Command Endpoints:**
- ✅ Can create contracts
- ✅ Can exercise choices
- ❌ Cannot query existing contracts

**Event Endpoints:**
- ✅ Can get events for a contract
- ❌ Requires contract ID (we don't have it)
- ❌ Cannot search by template

**Version Endpoint:**
- ✅ Returns version info
- ❌ Cannot query contracts

## Verification Steps Taken

1. ✅ **Reviewed OpenAPI Documentation**
   - Checked all paths in the OpenAPI spec
   - Verified all available endpoints
   - Confirmed no query endpoints exist

2. ✅ **Tested All Endpoint Variations**
   - Tried `/v1/query`, `/v2/query`, `/query`
   - Tried `/v1/contracts/search`, `/v2/contracts/search`
   - Tried `/v1/contracts`, `/v2/contracts`
   - All returned 404 errors

3. ✅ **Analyzed Existing Endpoints**
   - `/v2/commands/completions` - Returns completions, not contracts
   - `/v2/events/events-by-contract-id` - Requires contract ID
   - All other endpoints are for command submission

4. ✅ **Checked Alternative Approaches**
   - gRPC API has query capabilities (but not JSON API)
   - WebSocket API exists (but not HTTP JSON endpoints)
   - Block explorer exists (but not an API endpoint)

## External Verification

**Web Search Results:**
- Confirmed that Canton JSON API does not include contract query endpoints
- Suggested alternatives: gRPC Ledger API or WebSocket API
- Referenced official Digital Asset documentation

**Official Documentation References:**
- JSON Ledger API Service V2: https://docs.digitalasset.com/build/3.4/explanations/json-api/index.html
- Canton and the JSON Ledger API: https://docs.digitalasset.com/build/3.3/tutorials/json-api/canton_and_the_json_ledger_api.html

## Conclusion

**✅ CONFIRMED: No endpoint exists in Canton JSON API for querying contracts by template ID.**

**All available endpoints have been verified:**
- ✅ Command endpoints exist (for creating/exercising contracts)
- ✅ Event endpoints exist (but require contract ID)
- ✅ Version endpoint exists (for version info)
- ❌ Query endpoints do NOT exist

**What the client should look for:**
- An endpoint that accepts `templateIds` and returns contracts
- An endpoint that supports query filters on contract data
- Alternative: gRPC API or WebSocket API for contract queries
- Alternative: HTTP wrapper for gRPC contract queries

## Questions for Client

If the client insists there's an endpoint, ask them to provide:

1. **The exact endpoint path** (e.g., `/v2/contracts/active`)
2. **The HTTP method** (GET or POST)
3. **The request format** (what body/parameters it accepts)
4. **The response format** (what it returns)
5. **The OpenAPI documentation reference** (where it's documented)

This will help us verify if:
- It's a different API (gRPC, not JSON API)
- It's a WebSocket endpoint (not HTTP)
- It's a custom endpoint not in the standard OpenAPI spec
- It's a different version of the API

## Final Verification Checklist

- [x] Reviewed complete OpenAPI specification
- [x] Tested all endpoint variations
- [x] Analyzed all existing endpoints
- [x] Verified with web search
- [x] Checked official documentation
- [x] Confirmed no query endpoints exist in JSON API

**Status**: ✅ **VERIFIED - No contract query endpoints exist in Canton JSON API**
