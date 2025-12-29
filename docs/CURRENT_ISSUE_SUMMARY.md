# Current Issue Summary

## ✅ Progress Made

1. **Authentication**: ✅ Working (400 instead of 403)
2. **Onboarding**: ✅ Complete
3. **Party ID**: ✅ Found: `122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
4. **Token**: ✅ Valid and accepted

## ❌ Current Issue

**Error**: `400 "Invalid value for: body"`

This is a very generic error that could mean:
1. Template ID format is incorrect
2. Request body structure is wrong
3. Field types/encoding are incorrect
4. Missing required fields

## What We've Tried

### Template ID Formats
- ✅ `Token:TokenBalance` → 400 (format issue)
- ✅ `Token:TokenBalance:<package-hash>` → 404 (format recognized, template not found)
- ✅ Various other formats → All return 400 or 404

### Token Field Formats
- ✅ Token as string → 400
- ✅ Token as minimal object `{id: "USDC"}` → 400
- ✅ Token as newtype `{TokenId: "USDC"}` → 400
- ✅ Token as full object → 400

### Request Structures
- ✅ With `applicationId` → 400
- ✅ Without `applicationId` → 400
- ✅ Minimal request → 400

## Template Definition

From `daml/Token.daml`:

```daml
template TokenBalance
  with
    owner : Party
    token : Token
    amount : Decimal
```

Where `Token` is:
```daml
data Token = Token
  with
    id : TokenId
    symbol : Text
    name : Text
    decimals : Int
    description : Text
```

And `TokenId` is:
```daml
newtype TokenId = TokenId Text
```

## Next Steps

1. **Check OpenAPI Spec**: Try to get Canton's JSON API OpenAPI spec to see exact format
2. **Try DAML Script**: Use DAML Script instead of JSON API (might be more reliable)
3. **Contact Client**: Ask for:
   - Correct template ID format
   - Example of working JSON API request
   - Or confirmation that JSON API is the right approach

## Party ID

**Wallet Address (Party ID)**: `122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`

This is confirmed working (authentication passes).

## Status

- ✅ Authentication: Working
- ✅ Party ID: Found and working
- ❌ Template ID: Format unknown
- ❌ Request Format: Needs clarification

**We're very close!** Just need the correct template ID format and/or request structure.

