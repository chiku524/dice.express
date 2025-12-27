# Command Format Fix - Based on OpenAPI Specification

## Problem

The `/v2/commands/submit-and-wait` endpoint was rejecting all request formats with 400 errors because the request structure didn't match the OpenAPI specification.

## Root Cause

After analyzing the OpenAPI specification from `https://participant.dev.canton.wolfedgelabs.com/docs/openapi`, we found that:

1. **`JsCommands` schema structure**:
   - `commands` must be an **array**, not an object
   - Required fields: `actAs` (array), `commandId` (string), `commands` (array)
   - Optional fields: `userId`, `readAs`, `workflowId`, etc.

2. **`Command` schema** uses a `oneOf` pattern:
   - `{ CreateCommand: { templateId, createArguments } }`
   - `{ ExerciseCommand: { templateId, contractId, choice, argument } }`
   - `{ ExerciseByKeyCommand: {...} }`
   - `{ CreateAndExerciseCommand: {...} }`

3. **Field name differences**:
   - Use `createArguments` instead of `payload`
   - Use `actAs` array instead of `party` field

## Solution

The API route (`api/command.js`) now transforms the frontend's format to the correct v2 format:

### Old Format (from frontend):
```json
{
  "commands": {
    "party": "User_123",
    "applicationId": "prediction-markets",
    "commandId": "create-123",
    "list": [
      {
        "templateId": "PredictionMarkets:MarketCreationRequest",
        "payload": {...}
      }
    ]
  }
}
```

### New Format (v2 - correct):
```json
{
  "actAs": ["User_123"],
  "commandId": "create-123",
  "commands": [
    {
      "CreateCommand": {
        "templateId": "PredictionMarkets:MarketCreationRequest",
        "createArguments": {...}
      }
    }
  ]
}
```

## Implementation

The transformation happens in `api/command.js`:

1. Extract `party`, `commandId`, and `list` from the old format
2. Convert `party` to `actAs` array
3. Transform each item in `list`:
   - `{ templateId, payload }` → `{ CreateCommand: { templateId, createArguments: payload } }`
   - `{ templateId, contractId, choice, argument }` → `{ ExerciseCommand: {...} }`
4. Build the correct v2 format structure

## OpenAPI Reference

Based on the OpenAPI specification from:
- Official docs: https://docs.digitalasset.com/build/3.4/reference/json-api/openapi.html
- Participant endpoint: https://participant.dev.canton.wolfedgelabs.com/docs/openapi

Key schemas:
- `JsCommands`: The top-level command structure
- `Command`: OneOf pattern for different command types
- `CreateCommand`: For creating contracts
- `ExerciseCommand`: For exercising choices

## Testing

After this fix, market creation should work correctly. The endpoint will:
1. Receive the old format from frontend
2. Transform it to correct v2 format
3. Submit to `/v2/commands/submit-and-wait`
4. Return successful response

## Next Steps

1. ✅ Fixed command format transformation
2. ⏳ Test market creation
3. ⏳ Verify exercise commands also work
4. ⏳ Update frontend documentation if needed (though frontend can keep using old format for backwards compatibility)

