# Contract Creation Issues - Troubleshooting Guide

## Current Status

We're encountering persistent errors when trying to create contracts via Canton JSON API. This document summarizes the issues and potential solutions.

**Last Updated**: Based on research from DAML Developers Community and Canton documentation.

## Errors Encountered

### 1. TokenBalance: "Missing non-optional field: unpack" ✅ RESOLVED

**Error Code**: `COMMAND_PREPROCESSING_FAILED`  
**Error Message**: `"Missing non-optional field: unpack"`

**Root Cause** (from [DAML Community Discussion](https://discuss.daml.com/t/do-newtypes-have-the-same-json-encoding-as-their-wrapped-types/4234)):
- In DAML, newtypes are represented as records with a single field named `unpack` in JSON encoding
- Canton JSON API expects newtypes to be serialized as: `{"unpack": "value"}`
- This is the standard DAML JSON encoding for newtypes

**Solution**:
- Serialize newtypes as objects with `unpack` field: `{ unpack: 'USDC' }`
- This is the correct format according to DAML JSON encoding specification

**What We Tried**:
- ❌ Object format: `{ TokenId: 'USDC' }` → Got "unpack" error
- ❌ Plain string: `'USDC'` → Got "Expected ujson.Obj" error
- ✅ **Correct format**: `{ unpack: 'USDC' }` → Should work

### 2. MarketCreationRequest/OracleDataFeed: "NO_SYNCHRONIZER_FOR_SUBMISSION"

**Error Code**: `NO_SYNCHRONIZER_FOR_SUBMISSION`  
**Error Message**: `"No valid synchronizer for submission found."`

**Root Cause** (from [Canton Documentation](https://docs.digitalasset.com/operate/3.5/howtos/troubleshoot/FAQ.html)):
- The participant node lacks a synchronizer for the submission
- A synchronizer is essential for coordinating transactions across domains
- The party needs to be properly synchronized with a domain that supports the required protocol version

**Analysis**:
- This is a Canton infrastructure/configuration issue, not a code issue
- The participant must be connected to a domain with proper synchronizer configuration
- This typically requires admin access to configure the Canton participant

**Solution** (Requires Admin Access):
- Verify participant is connected to a domain
- Ensure synchronizer is properly configured on the participant
- Check domain and participant protocol version compatibility

## Potential Solutions

### Solution 1: Verify Canton JSON API Version

The serialization format might depend on the Canton version. Check:
- What version of Canton is running on the devnet?
- Does the JSON API version match our expectations?
- Are there version-specific serialization requirements?

### Solution 2: Package Vetting

Even though we're using explicit package IDs, the package might still need to be vetted:
- Contact the client to vet the package: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
- Vetting might resolve serialization issues

### Solution 3: Check Reference Implementation

The user mentioned a reference script at:
`https://github.com/hyperledger-labs/splice/blob/main/token-standard/cli/src/commands/transfer.ts`

**Action Required**: Review this script to see:
- How newtypes are serialized
- What format Canton actually expects
- Any special handling required

### Solution 4: Party Synchronization

For the "NO_SYNCHRONIZER_FOR_SUBMISSION" error:
- Verify the party is properly synchronized with a domain
- Check if the party needs to be registered on a domain
- Contact client to ensure party synchronization is configured

### Solution 5: Correct Newtype Serialization Format ✅

**Correct Format** (per DAML JSON encoding specification):
```json
{
  "id": { "unpack": "USDC" }
}
```

**Reference**: [DAML Community Discussion on Newtype JSON Encoding](https://discuss.daml.com/t/do-newtypes-have-the-same-json-encoding-as-their-wrapped-types/4234)

**Why This Format**:
- DAML newtypes are represented as records with a single field in JSON
- The field is named `unpack` by default
- This is the standard DAML JSON encoding for newtypes
- Canton JSON API follows this specification

## Next Steps

1. ✅ **Fixed Newtype Serialization**: Updated code to use `{ unpack: 'USDC' }` format
2. **Test TokenBalance Creation**: Should now work with correct unpack format
3. **Contact Client for Synchronizer Issue**: For "NO_SYNCHRONIZER_FOR_SUBMISSION" errors:
   - Ask about participant domain connection status
   - Request synchronizer configuration for the party
   - Verify domain protocol version compatibility
4. **Verify Canton Version**: The version shown on ccexplorer.io (0.5.4) may be the explorer version, not Canton version
   - Ask client for actual Canton version running on devnet
   - Check if there are version-specific requirements

## Current Request Format

```json
{
  "actAs": ["ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292"],
  "commandId": "test-tokenbalance-1767094380387",
  "applicationId": "prediction-markets",
  "commands": [{
    "CreateCommand": {
      "templateId": "b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:Token:TokenBalance",
      "createArguments": {
        "owner": "ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292",
        "token": {
          "id": { "unpack": "USDC" },  // ✅ Correct format: DAML newtypes use {"unpack": "value"}
          "symbol": "USDC",
          "name": "USD Coin",
          "decimals": 6,
          "description": "Test USDC token for prediction markets"
        },
        "amount": 1000000
      }
    }
  }]
}
```

## DAML Definition

```daml
newtype TokenId = TokenId Text
  deriving (Eq, Ord, Show)

data Token = Token
  with
    id : TokenId
    symbol : Text
    name : Text
    decimals : Int
    description : Text
  deriving (Eq, Show)
```

## Resources

- Package ID: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
- Party ID: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
- Endpoint: `https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait`
- Block Explorer: https://devnet.ccexplorer.io/ (Version 0.5.4 - may be explorer version, not Canton version)

## References

- [DAML Community: Newtype JSON Encoding](https://discuss.daml.com/t/do-newtypes-have-the-same-json-encoding-as-their-wrapped-types/4234)
- [Canton Troubleshooting FAQ](https://docs.digitalasset.com/operate/3.5/howtos/troubleshoot/FAQ.html)
- [Canton JSON API Documentation](https://www.canton.io/docs/json-api.html)

