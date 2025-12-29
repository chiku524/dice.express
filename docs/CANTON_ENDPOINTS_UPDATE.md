# Canton Endpoints Update

## Client Information

**Huzefa Shakir:**
> "I have changed the paths
> 
> participant.dev.canton.wolfedgelabs.com is for admin-api 
> 
> and 
> 
> participant.dev.canton.wolfedgelabs.com/json-api is for json-api
> 
> I have exposed the grpc admin-api on participant.dev.canton.wolfedgelabs.com/admin-api"

## Updated Endpoint Configuration

### Admin API (gRPC)
- **Base URL**: `participant.dev.canton.wolfedgelabs.com:443`
- **Alternative**: `participant.dev.canton.wolfedgelabs.com/admin-api` (gRPC)
- **Protocol**: gRPC
- **Usage**: DAR file uploads, admin operations
- **Service**: `com.digitalasset.canton.admin.participant.v30.PackageService/UploadDar`

### JSON API (HTTP/JSON)
- **Base URL**: `https://participant.dev.canton.wolfedgelabs.com/json-api`
- **Protocol**: HTTP/JSON
- **Usage**: Contract queries, command submissions
- **Endpoints**: 
  - `/v2/commands/submit-and-wait` - Submit commands and wait for completion
  - `/v1/command` - Legacy command endpoint (may not be available)
  - `/v2/query` - Query contracts
  - `/v1/query` - Legacy query endpoint (may not be available)

## Current Configuration Status

✅ **JSON API URLs**: Already using `/json-api` path correctly
- `scripts/setup-via-json-api.js`
- `api/command.js`
- `api/query.js`
- `frontend/src/services/ledgerClient.js`

✅ **Admin API URLs**: Already using base URL correctly
- `scripts/deploy-via-grpc-admin.ps1`

## Key Points

1. **JSON API** is at `/json-api` path (not base URL)
2. **Admin API** (gRPC) is at base URL or `/admin-api` path
3. Both use the same domain: `participant.dev.canton.wolfedgelabs.com`

## Authentication

Both APIs require JWT Bearer tokens:
- Token obtained from Keycloak
- Format: `Authorization: Bearer <token>`
- Token must include `daml_ledger_api` scope
- Token audience should match Canton's expectations

## Research Findings

Based on web research:

### Token Requirements
- **Lifetime**: Tokens with lifetime exceeding 5 minutes may not be accepted by default
- **Scopes**: Must include `daml_ledger_api` scope
- **Audience**: Must match Canton's expected audience
- **TLS**: Should be enabled on APIs receiving tokens

### JSON API Format
- Uses HTTP/JSON protocol
- v2 API uses `/v2/commands/submit-and-wait` endpoint
- Request format: `{ actAs: [string], commandId: string, commands: [Command] }`
- Command format: `{ CreateCommand: { templateId: string, createArguments: object } }`

### Security Best Practices
- Enable TLS on all APIs
- Store tokens securely in memory
- Manage token lifetimes appropriately
- Use mutual TLS for Admin API when possible

## Next Steps

1. ✅ Verify all scripts use correct endpoints (already correct)
2. ⏭️ Test with fresh token (may need to be < 5 minutes old)
3. ⏭️ Verify token audience matches Canton's expectations
4. ⏭️ Contact client if 403 errors persist

