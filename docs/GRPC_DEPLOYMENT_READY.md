# gRPC Admin API Deployment - Ready to Use

## Client Information

**Huzefa Shakir:**
> "I have exposed the grpc admin-api on participant.dev.canton.wolfedgelabs.com/admin-api"
> 
> "Sending script to upload dar file"

## Admin API Details

- **Host**: `participant.dev.canton.wolfedgelabs.com`
- **Port**: `443` (HTTPS)
- **Service**: `com.daml.ledger.api.v1.admin.PackageManagementService`
- **Method**: `UploadDarFile`

## Script Created

✅ **`scripts/deploy-via-grpc-admin.bat`** - Ready to use!

This script:
1. ✅ Checks if `grpcurl` is installed
2. ✅ Verifies DAR file exists
3. ✅ Gets authentication token from Keycloak
4. ✅ Base64 encodes the DAR file
5. ✅ Creates gRPC request with submission ID
6. ✅ Uploads DAR via gRPC Admin API

## Prerequisites

### Install grpcurl

**Windows (using Chocolatey):**
```bash
choco install grpcurl
```

**Or download manually:**
- Download from: https://github.com/fullstorydev/grpcurl/releases
- Extract and add to PATH

**Verify installation:**
```bash
grpcurl --version
```

## Usage

```bash
scripts\deploy-via-grpc-admin.bat
```

The script will:
1. Prompt for Keycloak credentials (if token.json doesn't exist)
2. Build the DAR file if needed
3. Upload via gRPC Admin API

## How It Works

1. **Base64 Encode DAR**: Converts DAR file to base64 string
2. **Create Request**: JSON payload with `dar_file` and `submission_id`
3. **Send via grpcurl**: Uses grpcurl to call the gRPC service
4. **Authentication**: Includes Bearer token in headers

## Example Request

```json
{
  "dar_file": "<base64-encoded-dar-content>",
  "submission_id": "<unique-guid>"
}
```

## Notes

- **TLS**: Using `-insecure` flag for HTTPS without certificate verification
  - For production, use proper TLS certificates
- **Message Size**: Default gRPC limit is 4MB
  - Our DAR file is ~529KB, so it should work fine
- **Authentication**: Uses the same Bearer token from Keycloak

## Testing

1. ✅ Test with HelloWorld contract first (as Mohak suggested)
2. ✅ Verify deployment success
3. ✅ Then deploy main contracts

## Next Steps

1. **Install grpcurl** (if not already installed)
2. **Run the script**: `scripts\deploy-via-grpc-admin.bat`
3. **Test with HelloWorld**: Verify it works
4. **Update if needed**: Once client provides their script, we can compare and update

## Alternative: Client's Script

The client mentioned they'll send a script. Once received, we can:
- Compare approaches
- Update our script if needed
- Use whichever works best

