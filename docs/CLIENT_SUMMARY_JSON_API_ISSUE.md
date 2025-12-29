# Client Summary: JSON API Contract Creation Issue

## Date
December 29, 2025

## Status: Authentication Working, Request Format Issue

### ✅ What's Working

1. **Authentication**: ✅ **RESOLVED**
   - Previously: 403 "invalid token"
   - Now: 400 "Invalid value for: body"
   - **This confirms authentication is working correctly**

2. **Onboarding**: ✅ **COMPLETE**
   - User successfully onboarded via Wallet UI
   - Party ID mapped: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
   - Wallet address (Party ID): `122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`

3. **Token**: ✅ **VALID**
   - JWT token is valid and accepted by Canton
   - Token has correct scopes: `daml_ledger_api`, `profile`, `email`
   - Token audience matches: `https://canton.network.global`

4. **Package Deployment**: ✅ **SUCCESSFUL**
   - DAR file deployed: `prediction-markets-1.0.0.dar`
   - Package ID: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
   - Deployment confirmed via gRPC Admin API

---

## ❌ Current Issue

**Error**: `400 "Invalid value for: body"`

All attempts to create contracts via JSON API return this generic error. The error occurs at the request validation stage, suggesting the request body format is incorrect.

**Endpoint**: `POST https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait`

---

## What We've Tried

### 1. Template ID Formats

We've tested multiple template ID formats for `Token:TokenBalance`:

- ✅ `Token:TokenBalance` → 400 (format issue)
- ✅ `Token:TokenBalance:<package-hash>` → 404 (format recognized, template not found)
- ✅ `Token:TokenBalance:<short-package-hash>` → 404 (format recognized)
- ✅ `prediction-markets:Token:TokenBalance` → 404 (format recognized)
- ✅ Various other combinations → All return 400 or 404

**Observation**: Some formats return 404 "TEMPLATES_OR_INTERFACES_NOT_FOUND", which means the format is being parsed correctly, but the template isn't found. This suggests the template ID format might be close, but needs adjustment.

### 2. Request Body Structures

We've tested different request body formats:

- ✅ With `applicationId` field → 400
- ✅ Without `applicationId` field → 400
- ✅ Minimal request (only required fields) → 400
- ✅ v1 format (`commands: { party, applicationId, commandId, list }`) → 404 (endpoint not found)
- ✅ v2 format (`actAs, commandId, commands`) → 400

### 3. Field Encoding

We've tested different encodings for the `Token` data type:

- ✅ Token as string: `"USDC"` → 400
- ✅ Token as minimal object: `{ "id": "USDC" }` → 400
- ✅ Token as newtype: `{ "TokenId": "USDC" }` → 400
- ✅ Token as full object:
  ```json
  {
    "id": "USDC",
    "symbol": "USDC",
    "name": "USD Coin",
    "decimals": 6,
    "description": "Test"
  }
  ```
  → 400

### 4. Party ID Formats

- ✅ Short party ID: `122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292` → 400
- ✅ Full party ID: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292` → 400

**Note**: Both formats return 400 (not 403), confirming authentication works with both.

---

## Current Request Format

We're currently using this format:

```json
{
  "actAs": ["122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292"],
  "commandId": "test-1767035890588",
  "applicationId": "prediction-markets",
  "commands": [
    {
      "CreateCommand": {
        "templateId": "Token:TokenBalance",
        "createArguments": {
          "owner": "122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292",
          "token": {
            "id": "USDC",
            "symbol": "USDC",
            "name": "USD Coin",
            "decimals": 6,
            "description": "Test token"
          },
          "amount": 1000.0
        }
      }
    }
  ]
}
```

**Headers**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

---

## Template Definition

From our DAML code (`daml/Token.daml`):

```daml
template TokenBalance
  with
    owner : Party
    token : Token
    amount : Decimal

data Token = Token
  with
    id : TokenId
    symbol : Text
    name : Text
    decimals : Int
    description : Text

newtype TokenId = TokenId Text
```

---

## Questions for Client

### 1. Template ID Format

**What is the correct template ID format for `Token:TokenBalance`?**

- Should it include the package hash? If so, what format?
- Is it simply `Token:TokenBalance`, or does it need additional qualifiers?
- Can you provide an example of a working template ID from your system?

**Example formats we've tried**:
- `Token:TokenBalance`
- `Token:TokenBalance:b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
- `prediction-markets:Token:TokenBalance`

### 2. Request Body Format

**Can you provide an example of a working JSON API request for creating a contract?**

Or confirm:
- Is our request body structure correct?
- Are we using the right endpoint (`/v2/commands/submit-and-wait`)?
- Is there a different endpoint we should be using?

**Current endpoint**: `POST https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait`

### 3. Alternative Approach

**Should we use DAML Script instead of JSON API?**

We have DAML Scripts ready (`daml/Setup.daml` and `daml/Setup-2.10.0.daml`) that can create contracts programmatically. Would this be a better approach, or do you prefer we continue with JSON API?

---

## What We Need

1. **Correct template ID format** - So we can reference the deployed template correctly
2. **Example working request** - To understand the exact format Canton expects
3. **Confirmation on approach** - JSON API vs DAML Script, or both

---

## Technical Details

- **Party ID**: `122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
- **Package ID**: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
- **Endpoint**: `https://participant.dev.canton.wolfedgelabs.com/json-api`
- **Authentication**: Working (JWT Bearer token)

---

## Next Steps (Pending Client Response)

1. ⏭️ Receive correct template ID format
2. ⏭️ Update scripts with correct format
3. ⏭️ Test contract creation
4. ⏭️ Proceed with market creation and testing

---

## Summary

**Progress**: Authentication and onboarding are complete. The party ID is confirmed and working.

**Blocker**: Request body format issue - need correct template ID format and/or request structure.

**Status**: Ready to proceed once we have the correct template ID format and request structure.

---

Thank you for your assistance! We're very close to getting contract creation working. 🚀

