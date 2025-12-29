# DAML Script Attempt Summary

## Attempted Approach

While waiting for client response on JSON API format, we tried using DAML Script as an alternative method for contract creation.

## Setup Scripts Available

1. **`daml/Setup.daml`** (SDK 3.4.9)
   - Uses `Daml.Script` module
   - Allocates parties and creates contracts

2. **`daml/Setup-2.10.0.daml`** (SDK 2.10.0)
   - Uses `DA.Scenario` module
   - Compatible with older SDK

3. **`daml/Setup-WithPartyId.daml`** (New)
   - Attempts to use actual party ID from onboarding
   - Uses `allocatePartyWithHint` with party ID

## Test Results

### Connection Issue

**Error**: `Connection reset` / `UNAVAILABLE: io exception`

**Endpoint tested**: 
- `participant.dev.canton.wolfedgelabs.com:443`

**Issue**: DAML Script uses **gRPC Ledger API**, which is different from:
- **Admin API** (gRPC) - for DAR uploads
- **JSON API** (HTTP) - for contract queries/commands

The Ledger API endpoint might be:
- At a different port
- At a different path
- Not exposed on the same domain

## Key Differences

| API Type | Protocol | Purpose | Endpoint |
|----------|----------|---------|----------|
| **Admin API** | gRPC | DAR uploads, admin ops | `participant.dev.canton.wolfedgelabs.com:443` or `/admin-api` |
| **JSON API** | HTTP/JSON | Contract queries, commands | `participant.dev.canton.wolfedgelabs.com/json-api` |
| **Ledger API** | gRPC | DAML Script, SDK operations | **Unknown** |

## What We Need

To use DAML Script, we need:
1. **Ledger API endpoint** (gRPC)
   - Host and port
   - Or path if different from Admin API

2. **Confirmation** that Ledger API is exposed
   - It might only be available internally
   - Or at a different endpoint

## Next Steps

1. **Ask client** for Ledger API endpoint (for DAML Script)
2. **Continue with JSON API** once we get the correct format
3. **Or use DAML Script** if Ledger API endpoint is provided

## Current Status

- ✅ DAML Scripts are ready and compiled
- ✅ Authentication token works
- ❌ Connection to Ledger API fails (endpoint unknown)
- ⏭️ Waiting for client response on:
  - JSON API template ID format
  - OR Ledger API endpoint for DAML Script

## Recommendation

Since JSON API is already partially working (authentication works, just need correct format), it might be faster to:
1. Wait for client's JSON API example/format
2. Use that to complete contract creation
3. DAML Script can be a backup option if JSON API doesn't work

