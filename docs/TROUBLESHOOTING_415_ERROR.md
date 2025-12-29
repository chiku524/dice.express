# Troubleshooting 415 Unsupported Media Type Error

## Issue
When creating a market from the frontend, you receive a `415 (Unsupported Media Type)` error.

## Possible Causes

### 1. Content-Type Header Issue
The API route should automatically set `Content-Type: application/json` when forwarding to Canton. If this is missing or incorrect, Canton will return 415.

**Fix**: The API route now explicitly sets the Content-Type header.

### 2. Request Body Format
The request body must match Canton's expected format. For v2 API:
```json
{
  "actAs": ["PartyName"],
  "commandId": "unique-command-id",
  "commands": [
    {
      "CreateCommand": {
        "templateId": "PredictionMarkets:MarketCreationRequest",
        "createArguments": { ... }
      }
    }
  ]
}
```

**Fix**: The API route now transforms the frontend format to Canton's v2 format.

### 3. Party Not Allocated
If the party (`wallet.party`) is not allocated on the Canton ledger, the request may fail. However, this typically gives a different error (not 415).

**To check**: Verify the party is allocated using Canton's party management API.

### 4. Template ID Format
The template ID must match the deployed package. Format: `ModuleName:TemplateName`

**Current template ID**: `PredictionMarkets:MarketCreationRequest`

**To verify**: Check the deployed package ID matches: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`

### 5. Field Name Mismatches
The frontend must send field names that match the DAML template exactly.

**Fixed fields**:
- `creatorAccount` → `creatorBalance`
- `adminAccount` → `adminBalance`

## Debugging Steps

1. **Check Vercel logs**: Look for `[api/command]` log entries to see:
   - Request body received
   - Transformed request body
   - Endpoint tried
   - Response status

2. **Check browser console**: Look for the full error response from the API route.

3. **Verify party allocation**: Ensure the party used in `wallet.party` is allocated on Canton.

4. **Test with curl**: Try sending a direct request to Canton's JSON API to verify the format:
```bash
curl -X POST https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait \
  -H "Content-Type: application/json" \
  -d '{
    "actAs": ["YourParty"],
    "commandId": "test-123",
    "commands": [{
      "CreateCommand": {
        "templateId": "PredictionMarkets:MarketCreationRequest",
        "createArguments": {
          "creator": "YourParty",
          "admin": "Admin",
          "marketId": "test-market",
          "title": "Test Market",
          "description": "Test",
          "marketType": { "tag": "Binary" },
          "outcomes": [],
          "settlementTrigger": { "tag": "Manual" },
          "resolutionCriteria": "Test",
          "depositAmount": 100.0,
          "depositCid": null,
          "configCid": null,
          "creatorBalance": null,
          "adminBalance": null
        }
      }
    }]
  }'
```

## Next Steps

If the error persists:
1. Check Vercel function logs for detailed error messages
2. Verify the party is allocated on Canton
3. Test with a simpler contract creation to isolate the issue
4. Contact Canton support if the issue appears to be on their end

