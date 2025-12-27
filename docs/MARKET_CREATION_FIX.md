# Market Creation Request Fix

## Problem

Market creation was failing with "Invalid value for: body" because the `MarketCreationRequest` template required several fields that were being sent as `null`:

- `depositCid : ContractId Holding` (required)
- `configCid : ContractId MarketConfig` (required)
- `creatorAccount : Account` (required)
- `adminAccount : Account` (required)

DAML does not accept `null` for required (non-Optional) fields, causing validation errors.

## Solution

Made these fields Optional in the `MarketCreationRequest` template:

```daml
template MarketCreationRequest
  with
    ...
    depositCid : Optional (ContractId Holding)  -- Optional - can be set during approval
    configCid : Optional (ContractId MarketConfig)  -- Optional - can be fetched during approval
    creatorAccount : Optional Account  -- Optional - can be set during approval
    adminAccount : Optional Account  -- Optional - can be set during approval
```

### Changes Made

1. **Template Fields**: Changed from required to `Optional` type
2. **ApproveMarket Choice**: Updated to handle Optional `configCid`:
   - Extracts `configCid` using pattern matching
   - Aborts if `configCid` is `None` (since it's needed for approval)
3. **API Layer**: Keeps `null` values in payload - DAML accepts `null` for Optional fields in JSON encoding

## DAML Optional JSON Encoding

In DAML's JSON encoding, Optional fields can be:
- `null` for `None`
- The actual value for `Some(value)`

So when the frontend sends `depositCid: null`, DAML correctly interprets it as `Optional None`.

## Next Steps

For a complete implementation, the `ApproveMarket` choice should:
1. Query for `MarketConfig` if `configCid` is `None`
2. Create or fetch account contracts if needed
3. Handle deposit creation if `depositCid` is `None`

For now, the market creation request can be created without these fields, and they can be provided later when the market is approved.

