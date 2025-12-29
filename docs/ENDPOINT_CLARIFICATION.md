# Endpoint Path Clarification

## Client Update

**Huzefa Shakir:**
> "I have changed the paths
> 
> participant.dev.canton.wolfedgelabs.com is for admin-api
> 
> and
> 
> participant.dev.canton.wolfedgelabs.com/json-api is for json-api"

## Correct Endpoints

### Admin API (gRPC)
- **Base URL**: `participant.dev.canton.wolfedgelabs.com:443`
- **Protocol**: gRPC
- **Usage**: DAR file uploads, admin operations
- **Service**: `com.digitalasset.canton.admin.participant.v30.PackageService/UploadDar`

### JSON API (HTTP/JSON)
- **Base URL**: `participant.dev.canton.wolfedgelabs.com/json-api`
- **Protocol**: HTTP/JSON
- **Usage**: Contract queries, command submissions
- **Endpoints**: 
  - `/v2/commands/submit-and-wait` (or `/v1/command`)
  - `/v1/query` (or `/v2/query`)

## Updated Configuration

Our deployment script uses:
- ✅ **Admin API**: `participant.dev.canton.wolfedgelabs.com:443` (correct)

Our frontend/API routes should use:
- ✅ **JSON API**: `participant.dev.canton.wolfedgelabs.com/json-api` (needs update)

## Action Items

1. ✅ **Deployment script** - Already using correct admin API endpoint
2. ⏭️ **Update frontend/API routes** - Change to use `/json-api` path
3. ⏭️ **Update environment variables** - Ensure LEDGER_URL includes `/json-api`

