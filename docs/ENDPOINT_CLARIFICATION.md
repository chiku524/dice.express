# Endpoint Path Clarification

## Client Updates

### Update 1
**Huzefa Shakir:**
> "I have changed the paths
> 
> participant.dev.canton.wolfedgelabs.com is for admin-api
> 
> and
> 
> participant.dev.canton.wolfedgelabs.com/json-api is for json-api"

### Update 2
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

## Correct Endpoints

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

## Updated Configuration

Our deployment script uses:
- ✅ **Admin API**: `participant.dev.canton.wolfedgelabs.com:443` (correct)

Our frontend/API routes should use:
- ✅ **JSON API**: `participant.dev.canton.wolfedgelabs.com/json-api` (needs update)

## Action Items

1. ✅ **Deployment script** - Already using correct admin API endpoint
2. ⏭️ **Update frontend/API routes** - Change to use `/json-api` path
3. ⏭️ **Update environment variables** - Ensure LEDGER_URL includes `/json-api`

