# Ledger API Endpoint Research Findings

## Test Results

### ✅ Port 443 with TLS - Accessible

**Endpoint**: `participant.dev.canton.wolfedgelabs.com:443` (with TLS)

**Status**: ✅ **Accessible via gRPC**

**Services Found** (via grpcurl):
- `com.digitalasset.canton.admin.health.v30.StatusService`
- `com.digitalasset.canton.admin.participant.v30.PackageService`
- `com.digitalasset.canton.admin.participant.v30.PartyManagementService`
- `com.digitalasset.canton.admin.participant.v30.ParticipantStatusService`
- ... (and other Admin API services)

### ❌ Port 6865 - Not Accessible

**Endpoint**: `participant.dev.canton.wolfedgelabs.com:6865`

**Status**: ❌ **Connection refused**

**Error**: `No connection could be made because the target machine actively refused it`

### ❌ Port 5011 - Not Accessible

**Endpoint**: `participant.dev.canton.wolfedgelabs.com:5011`

**Status**: ❌ **Connection refused**

**Error**: `No connection could be made because the target machine actively refused it`

## Key Discovery

### Port 443 Exposes Admin API, Not Ledger API

**Important Finding:**
- Port 443 with TLS is accessible ✅
- But it exposes **Admin API services**, not **Ledger API services**
- Ledger API services (CommandSubmissionService, TransactionService, etc.) are **not in the list**

**Admin API Services Found:**
- `PackageService` - For DAR uploads ✅ (we use this)
- `PartyManagementService` - For party management
- `ParticipantStatusService` - For status checks
- etc.

**Ledger API Services (NOT Found):**
- `CommandSubmissionService` - For submitting commands
- `TransactionService` - For reading transactions
- `ActiveContractsService` - For querying contracts
- `CommandCompletionService` - For tracking commands
- etc.

## Conclusion

### Ledger API is NOT Publicly Exposed

**Evidence:**
1. Port 443 exposes Admin API (gRPC), not Ledger API
2. Standard Ledger API ports (6865, 5011) are not accessible
3. No Ledger API services found in the service list

**This Explains:**
- Why DAML Script connection fails
- Why we need to use JSON API instead
- Why JSON API is the intended public interface

## What This Means

### For DAML Script

**DAML Script requires:**
- Direct gRPC access to Ledger API
- Ledger API services (CommandSubmissionService, etc.)
- These are **not publicly exposed**

**Options:**
1. **Ask client to expose Ledger API** (if DAML Script is required)
2. **Use JSON API instead** (recommended - already working)

### For JSON API

**JSON API:**
- ✅ Publicly accessible at `/json-api`
- ✅ Acts as proxy/wrapper around Ledger API
- ✅ Authentication working
- ⏭️ Only need template ID format

**This is the correct approach!**

## Recommendation

### Continue with JSON API

**Why:**
1. ✅ Ledger API is not publicly exposed
2. ✅ JSON API is the intended public interface
3. ✅ Authentication is already working
4. ✅ Only need template ID format from client

### If DAML Script is Required

**Ask client:**
1. Can Ledger API be exposed?
2. What is the endpoint?
3. Is it required, or can we use JSON API?

## References

- [Daml Ledger API Documentation](https://docs.daml.com/app-dev/ledger-api.html)
- [Daml JSON API Documentation](https://docs.daml.com/json-api/index.html)
- Test results from `scripts/test-ledger-api-endpoints.ps1`

## Summary

**Finding**: Ledger API is **not publicly exposed**. Port 443 only exposes Admin API services.

**Conclusion**: **JSON API is the correct approach** for contract creation. Continue waiting for client's template ID format.

**Status**: Research complete. Ready to proceed with JSON API once we have the template ID format.

