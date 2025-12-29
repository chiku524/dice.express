# Canton JSON API Guide

## Overview

Complete guide for using Canton JSON API for contract creation, queries, and operations.

## Endpoint Configuration

### Base URLs

- **JSON API**: `https://participant.dev.canton.wolfedgelabs.com/json-api`
- **Admin API (gRPC)**: `participant.dev.canton.wolfedgelabs.com:443` or `participant.dev.canton.wolfedgelabs.com/admin-api`

## Authentication

### Token Requirements

1. **Token Lifetime**
   - ⚠️ **Critical**: Tokens with lifetime **exceeding 5 minutes may be rejected by default**
   - Recent Canton updates have tightened security configurations
   - **Recommendation**: Use tokens immediately after creation, or request shorter-lived tokens

2. **Token Scopes**
   - Required: `daml_ledger_api`
   - Optional: `profile`, `email`

3. **Token Audience**
   - Must match Canton's expected audience
   - Current token has: `https://canton.network.global, account`

4. **Token Format**
   - JWT format
   - Include in header: `Authorization: Bearer <token>`

### Getting Tokens

```powershell
.\scripts\get-keycloak-token.ps1 -Username "user@example.com" -Password "password"
.\scripts\extract-token.ps1
```

**Important**: Use the token immediately after creation to avoid lifetime issues.

## Contract Creation

### Endpoint

```
POST https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait
```

### Request Format

```json
{
  "actAs": ["Party1", "Party2"],
  "commandId": "unique-command-id",
  "applicationId": "prediction-markets",
  "commands": [
    {
      "CreateCommand": {
        "templateId": "Module:Template",
        "createArguments": {
          "field1": "value1",
          "field2": "value2"
        }
      }
    }
  ]
}
```

### Headers

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

### Response Format

```json
{
  "result": {
    "created": [
      {
        "contractId": "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00#12345",
        "templateId": "Module:Template",
        "payload": { ... }
      }
    ],
    "exercised": [],
    "events": []
  }
}
```

### Example: Create TokenBalance

```json
{
  "actAs": ["Admin"],
  "commandId": "create-token-balance-1234567890",
  "applicationId": "prediction-markets",
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
          "amount": 1000000.0
        }
      }
    }
  ]
}
```

## Contract Queries

### Endpoint

```
POST https://participant.dev.canton.wolfedgelabs.com/json-api/v2/query
```

### Request Format

```json
{
  "templateIds": ["Module:Template"],
  "query": {
    "field": "value"
  }
}
```

### Response Format

```json
{
  "result": [
    {
      "contractId": "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00#12345",
      "templateId": "Module:Template",
      "payload": { ... }
    }
  ]
}
```

## Exercise Choices

### Request Format

```json
{
  "actAs": ["Party1"],
  "commandId": "exercise-choice-1234567890",
  "applicationId": "prediction-markets",
  "commands": [
    {
      "ExerciseCommand": {
        "templateId": "Module:Template",
        "contractId": "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00#12345",
        "choice": "ChoiceName",
        "argument": {
          "field": "value"
        }
      }
    }
  ]
}
```

## Common Issues

### 403 "Invalid Token"

**Possible Causes:**
1. Token lifetime > 5 minutes (default limit)
2. Token audience mismatch
3. Missing required scopes
4. Token validation configuration

**Solutions:**
1. Use token immediately after creation
2. Request shorter-lived tokens
3. Verify token audience matches Canton's expectations
4. Ensure all required scopes are present

### 400 "Invalid value for: body"

**Possible Causes:**
1. Request format incorrect
2. Missing required fields
3. Field type mismatches

**Solutions:**
1. Verify request format matches examples above
2. Check all required fields are present
3. Verify field types match template definitions

### 404 "Endpoint not found"

**Possible Causes:**
1. Wrong endpoint path
2. API not enabled on Canton
3. Version mismatch

**Solutions:**
1. Verify endpoint path includes `/json-api`
2. Check if JSON API is enabled on Canton
3. Try different API versions (v1 vs v2)

## Best Practices

1. **Use Fresh Tokens**: Request and use tokens immediately
2. **Enable TLS**: Always use HTTPS
3. **Handle Errors**: Implement proper error handling
4. **Validate Responses**: Check response structure before processing
5. **Manage Token Lifecycle**: Refresh tokens before expiration

## Testing

### Test with Fresh Token

```powershell
.\scripts\test-fresh-token.ps1 -Username "user@example.com" -Password "password"
```

This script:
1. Requests a fresh token
2. Uses it immediately (within seconds)
3. Tests the JSON API endpoint
4. Reports token age when used

### Verify Token

```bash
node scripts/verify-token.js
```

This checks:
- Token format
- Expiration
- Scopes
- Audience

## Resources

- **Canton Documentation**: https://docs.digitalasset.com
- **Canton Security Guide**: https://docs.digitalasset.com/overview/3.3/explanations/canton/security.html
- **Canton Quickstart**: https://github.com/digital-asset/cn-quickstart
- **Secure Canton Infrastructure**: https://github.com/digital-asset/ex-secure-canton-infra

