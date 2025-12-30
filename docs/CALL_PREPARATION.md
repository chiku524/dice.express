# Client Call Preparation - Contract Creation Issues

## Call Objective
Resolve contract creation issues and ensure deployed contracts work correctly on Canton devnet.

---

## Current Status Summary

### ✅ What's Working
1. **Application Code**: All code is correct and matches DAML/Canton specifications
   - Newtype serialization: `{ unpack: "value" }` format ✅
   - Template IDs: Using explicit package ID format ✅
   - Enum serialization: Correct string format ✅
   - Request structure: Matches Canton JSON API v2 specification ✅

2. **Permissions**: Party has both `actAs` and `readAs` permissions
   - Verified via UserManagementService/ListUserRights
   - User ID: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa`
   - Party: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`

3. **Participant Connection**: Participant is connected to domain
   - Verified via validator rewards: https://devnet.ccview.io/validators/wolfedgelabs-dev-1::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292/

### ❌ Current Blocking Issue
**Error**: `NO_SYNCHRONIZER_FOR_SUBMISSION`  
**Message**: "No valid synchronizer for submission found."

**Affects**: ALL contract creation attempts (TokenBalance, MarketCreationRequest, OracleDataFeed, etc.)

---

## Technical Details

### Party Information
- **Party ID**: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
- **User ID**: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa`
- **Package ID**: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
- **Package Name**: `prediction-markets`

### Endpoint
- **Base URL**: `https://participant.dev.canton.wolfedgelabs.com/json-api`
- **Command Endpoint**: `/v2/commands/submit-and-wait`
- **Query Endpoint**: `/v2/query`

### Request Format (Example)
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
          "id": { "unpack": "USDC" },
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

### Error Response
```json
{
  "code": "NO_SYNCHRONIZER_FOR_SUBMISSION",
  "cause": "No valid synchronizer for submission found.",
  "correlationId": null,
  "traceId": null,
  "context": {
    "definite_answer": "false",
    "category": "9"
  },
  "resources": [],
  "errorCategory": 9,
  "grpcCodeValue": 9
}
```

---

## Questions to Ask Client

### 1. Party Synchronization
- [ ] Is the party `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292` registered on the domain?
- [ ] Does this party need to be explicitly synchronized on the domain (separate from participant connection)?
- [ ] Is there a difference between the validator operator party and user parties in terms of synchronization requirements?
- [ ] How do we register/synchronize a party on the domain?

### 2. Synchronizer Configuration
- [ ] Is the synchronizer enabled for this specific party?
- [ ] Is synchronizer configuration party-specific or participant-wide?
- [ ] What's the process to enable synchronizer for a party?
- [ ] Are there any domain-level settings that need to be configured?

### 3. Domain Configuration
- [ ] Which domain should this party be connected to?
- [ ] Are there multiple domains, and does the party need to be on a specific one?
- [ ] What's the domain connection status for this specific party (not just the participant)?

### 4. Package Status
- [ ] Is the package `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0` vetted on all required participants?
- [ ] Are there any package vetting requirements we need to meet?
- [ ] Should we be using package name instead of package ID?

### 5. Canton Version & Configuration
- [ ] What version of Canton is running on the devnet?
- [ ] Are there any version-specific requirements or known issues?
- [ ] Are there any participant-level settings that might affect command submission?

### 6. Alternative Approaches
- [ ] Is there a different endpoint we should be using?
- [ ] Should we be using gRPC Admin API instead of JSON API?
- [ ] Are there any special headers or parameters required?
- [ ] Is there a different authentication method we should use?

### 7. Testing & Verification
- [ ] Can the client test contract creation with this party to verify it works on their end?
- [ ] Are there any logs we should check on the participant side?
- [ ] Is there a way to verify party synchronization status?

---

## What We Need to Resolve

### Primary Goal
Enable contract creation for party `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`

### Specific Actions Needed
1. **Party Registration**: Register/synchronize the party on the domain
2. **Synchronizer Enablement**: Enable synchronizer for this specific party
3. **Verification**: Test contract creation to confirm it works

### Expected Outcome
After resolution, we should be able to:
- ✅ Create TokenBalance contracts
- ✅ Create MarketCreationRequest contracts
- ✅ Create OracleDataFeed contracts
- ✅ Create all other contract types in our application

---

## Diagnostic Tools Available

### 1. Party Status Diagnostic
- **Endpoint**: `/api/party-status`
- **UI**: Available on `/test` page - "🔍 Check Party Status" button
- **What it checks**:
  - Query access (read permissions)
  - Command submission (write permissions)
  - Specific error codes
  - Actionable recommendations

### 2. Contract Tester
- **Location**: `/test` page
- **Features**:
  - Test all contract types
  - View detailed error messages
  - Check party status
  - View request/response details

---

## Testing Plan After Resolution

1. **Test TokenBalance Creation**
   - Verify newtype serialization works
   - Confirm contract is created successfully

2. **Test MarketCreationRequest**
   - Verify enum serialization works
   - Confirm contract is created successfully

3. **Test All Contract Types**
   - Run through all contracts in ContractTester
   - Verify each one works correctly

4. **Verify in Block Explorer**
   - Check contracts appear in: https://devnet.ccexplorer.io/
   - Verify contract details are correct

---

## Documentation References

### Internal Documentation
- `docs/CONTRACT_CREATION_ISSUES.md` - Complete troubleshooting guide
- `docs/WHAT_WE_CAN_DO.md` - What we can do vs. client action
- `docs/CANTON_JSON_API_GUIDE.md` - API usage guide

### External References
- [Canton Troubleshooting FAQ](https://docs.digitalasset.com/operate/3.5/howtos/troubleshoot/FAQ.html)
- [Canton JSON API Documentation](https://www.canton.io/docs/json-api.html)
- [DAML Community: Newtype JSON Encoding](https://discuss.daml.com/t/do-newtypes-have-the-same-json-encoding-as-their-wrapped-types/4234)

---

## Key Points to Emphasize

1. **Code is Correct**: All application code matches specifications
2. **Permissions are Correct**: Party has both actAs and readAs
3. **Participant is Connected**: Verified via validator rewards
4. **Issue is Specific**: Party-level synchronization needed
5. **Ready to Test**: We have diagnostic tools ready to verify resolution

---

## Call Agenda (Suggested)

1. **Introduction** (2 min)
   - Brief overview of current status
   - Confirm what's working vs. what's not

2. **Technical Deep Dive** (10 min)
   - Review error details
   - Discuss party synchronization requirements
   - Identify specific configuration needed

3. **Resolution Steps** (10 min)
   - Client performs configuration (if possible during call)
   - Or client explains what needs to be done
   - We test immediately after configuration

4. **Verification** (5 min)
   - Test contract creation
   - Verify in block explorer
   - Confirm all contract types work

5. **Next Steps** (3 min)
   - Document resolution
   - Plan for any remaining issues
   - Schedule follow-up if needed

---

## Notes Section

Use this space during the call to take notes:

### Client Responses:
- 
- 
- 

### Actions Agreed:
- 
- 
- 

### Follow-up Items:
- 
- 
- 

---

## Quick Reference

### Party ID
```
ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292
```

### Package ID
```
b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0
```

### Endpoint
```
https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait
```

### Error Code
```
NO_SYNCHRONIZER_FOR_SUBMISSION
```

---

## Success Criteria

After the call, we should have:
- ✅ Clear understanding of what needs to be configured
- ✅ Party synchronized and ready for contract creation
- ✅ At least one successful contract creation test
- ✅ Plan for testing all contract types
- ✅ Documentation of resolution steps

---

**Good luck with the call!** 🚀

