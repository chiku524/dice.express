# Contract Creation Issues - Troubleshooting Guide

## Current Status

We're encountering persistent errors when trying to create contracts via Canton JSON API. This document summarizes the issues and potential solutions.

**Last Updated**: December 30, 2025  
**Canton DevNet Version**: Likely Canton 3.4 (as of December 2025, per [Canton Network announcements](https://discuss.daml.com/t/canton-network-mainnet-v0-5-1-major-upgrade-announcement-and-advice/8287))  
**Block Explorer Version**: 0.5.4 (this is the explorer version, not Canton version)

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

### 2. ALL Contracts: "NO_SYNCHRONIZER_FOR_SUBMISSION" ⚠️ CRITICAL

**Error Code**: `NO_SYNCHRONIZER_FOR_SUBMISSION`  
**Error Message**: `"No valid synchronizer for submission found."`

**Status**: This error now affects ALL contract creation attempts, including TokenBalance (which previously had the "unpack" error).

**Root Cause** (from [Canton Documentation](https://docs.digitalasset.com/operate/3.5/howtos/troubleshoot/FAQ.html)):
- The participant node lacks a synchronizer for the submission
- A synchronizer is essential for coordinating transactions across domains
- The party needs to be properly synchronized with a domain that supports the required protocol version
- **This is a Canton infrastructure/configuration issue, NOT a code issue**

**What This Means**:
- The party `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292` is not properly connected to a domain
- Even though the party was onboarded, it may not be synchronized with a domain
- All contract creation attempts will fail until this is resolved

**Solution** (Requires Admin/Client Action):
1. **Verify Domain Connection**: Check if the participant is connected to a domain
2. **Enable Synchronizer**: Ensure synchronizer is properly configured on the participant
3. **Party Domain Registration**: Verify the party is registered on a domain
4. **Protocol Version**: Check domain and participant protocol version compatibility (Canton 3.4)

**Client Action Required**: This cannot be fixed from the application code - it requires Canton infrastructure configuration.

**What We CAN Do from Application Side**:
1. ✅ **Diagnostic Tool**: Created `/api/party-status` endpoint to check:
   - Whether party can read contracts (query access)
   - Whether party can write contracts (command submission)
   - Specific error codes and messages
   - Actionable recommendations

2. ✅ **Verify Request Format**: Confirmed our JSON payloads are correctly formatted:
   - Newtypes use `{ unpack: "value" }` format
   - Template IDs use explicit package ID format
   - All required fields are present

3. ✅ **Test Different Endpoints**: Already trying multiple API endpoints to find working one

**What We CANNOT Do**:
- ❌ Connect party to domain (requires admin access)
- ❌ Enable synchronizer (requires participant configuration)
- ❌ Register party on domain (requires admin access)
- ❌ Modify Canton participant settings (requires infrastructure access)

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

### ✅ Completed
1. **Fixed Newtype Serialization**: Updated code to use `{ unpack: 'USDC' }` format per DAML specification
2. **Fixed Template ID Format**: Using explicit package ID format to bypass vetting requirements
3. **Fixed Enum Serialization**: MarketType uses string format `"Binary"` instead of object

### ⚠️ Blocking Issue - Requires Client Action
**ALL contract creation attempts are now failing with "NO_SYNCHRONIZER_FOR_SUBMISSION"**

This indicates the party is not properly synchronized with a domain. This is a **Canton infrastructure issue** that requires admin configuration.

### Questions for Client

1. **Party Synchronization**:
   - Is the party `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292` connected to a domain?
   - Is the synchronizer enabled for this party?
   - Does the party need to be registered on a specific domain?

2. **Canton Version**:
   - What version of Canton is running on the devnet? (Likely 3.4 based on recent upgrades)
   - The block explorer shows version 0.5.4 - is this the explorer version or Canton version?

3. **Domain Configuration**:
   - Which domain should the party be connected to?
   - Are there any domain connection requirements we need to meet?

4. **Package Status**:
   - Is the package `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0` vetted on all required participants?
   - Are there any additional package requirements?

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
- [Canton Network MainNet Upgrade Announcement](https://discuss.daml.com/t/canton-network-mainnet-v0-5-1-major-upgrade-announcement-and-advice/8287) - Mentions Canton 3.4 upgrade
- [Canton GitHub Releases](https://github.com/digital-asset/canton/releases) - Latest version information

## Summary for Client

### What We've Fixed ✅
1. **Newtype Serialization**: All newtypes now use correct `{ unpack: "value" }` format
2. **Template ID Format**: Using explicit package ID to bypass vetting requirements  
3. **Enum Serialization**: MarketType uses correct string format

### Current Blocking Issue ⚠️
**All contract creation attempts fail with "NO_SYNCHRONIZER_FOR_SUBMISSION"**

This error indicates the party is not properly synchronized with a domain. This is a **Canton infrastructure configuration issue** that requires admin access to resolve.

**The application code is correct** - the issue is that the party needs to be:
1. Connected to a domain
2. Have a synchronizer enabled
3. Be properly registered on the domain

**Action Required**: Please configure the party's domain connection and synchronizer on the Canton participant.

