# Contract Creation Test Results

## Test Date
December 29, 2025

## Test 1: Package Verification

**Status**: ⚠️ Partial Success

**Results**:
- `/v2/packages` endpoint: **401 Unauthorized** (requires authentication)
- `/v1/packages` endpoint: **404 Not Found**
- `/packages` endpoint: **404 Not Found**
- Template query: **404 Not Found**

**Conclusion**: Package verification endpoints either require authentication or are not enabled. This is expected behavior - we can verify package availability by attempting contract creation.

## Test 2: TokenBalance Contract Creation

**Status**: ❌ Failed

**Endpoint Tested**: `https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait`

**Request Format**:
```json
{
  "actAs": ["Admin"],
  "commandId": "create-token-balance-1767022708533",
  "commands": [
    {
      "CreateCommand": {
        "templateId": "Token:TokenBalance",
        "createArguments": {
          "owner": "Admin",
          "token": {
            "id": "USDC",
            "symbol": "USDC",
            "name": "USD Coin",
            "decimals": 6,
            "description": "Stablecoin for prediction markets"
          },
          "amount": 1000000
        }
      }
    }
  ]
}
```

**Response**: **400 Bad Request**
- Error: `"Invalid value for: body"`

**Possible Issues**:
1. **Party Not Allocated**: The party "Admin" may not be allocated on Canton
2. **Template ID Format**: May need full package identifier (e.g., `package-id:Token:TokenBalance`)
3. **Request Structure**: The request body structure might not match Canton's expected format
4. **Authentication**: May require authentication token

## Next Steps

### Option 1: Verify Party Allocation
The party "Admin" must be allocated on Canton before creating contracts. Check with Canton admin or use party management API.

### Option 2: Check Template ID Format
The template ID might need to include the package identifier:
- Current: `Token:TokenBalance`
- May need: `<package-id>:Token:TokenBalance`

### Option 3: Use Authentication
If authentication is required, obtain a Bearer token and include it in the request headers.

### Option 4: Use DAML Script
Instead of JSON API, use DAML Script to create contracts:
```bash
daml script --dar .daml/dist/prediction-markets-1.0.0.dar --script-name Setup:setup
```

## Recommendations

1. **Contact Canton Admin**: Verify:
   - Party "Admin" is allocated
   - JSON API endpoints are enabled
   - Authentication requirements
   - Correct template ID format

2. **Test with DAML Script**: Use DAML Script as an alternative to verify contracts can be created

3. **Check Canton Documentation**: Review Canton JSON API v2 documentation for correct request format

## Error Details

### Full Error Response
```
Response status: 400
Non-JSON response: Invalid value for: body
```

### Endpoints Tried
1. `/v2/commands/submit-and-wait` - 400 Bad Request
2. `/v1/command` - 404 Not Found
3. `/v2/command` - 404 Not Found

