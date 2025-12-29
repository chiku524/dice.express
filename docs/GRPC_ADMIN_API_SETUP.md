# gRPC Admin API Setup

## Client Information

**Huzefa Shakir:**
> "I have exposed the grpc admin-api on participant.dev.canton.wolfedgelabs.com/admin-api"
> 
> "Sending script to upload dar file"

## Admin API Endpoint

- **Endpoint**: `https://participant.dev.canton.wolfedgelabs.com/admin-api`
- **Protocol**: gRPC (not JSON-API)
- **Port**: 443 (HTTPS)

## Current Status

⏳ **Waiting for client's script** - They will provide a script to upload DAR files

## What We Have Ready

✅ **DAR File**: `test-contract/.daml/dist/prediction-markets-test-1.0.0.dar` (529,133 bytes)  
✅ **Authentication**: Token generation working  
✅ **Test Contract**: HelloWorld contract ready for deployment  

## Scripts Created (Templates)

I've created template scripts that will be updated once we receive the client's script:

1. **`scripts/deploy-via-grpc-admin.bat`** - Windows batch script template
2. **`scripts/deploy-via-grpc-python.py`** - Python script template

## What We'll Need

Once we receive the client's script, we'll need to know:

1. **gRPC Service Definition**
   - Service name
   - Method name for uploading DARs
   - Request/response message types

2. **Authentication**
   - How to pass the Bearer token in gRPC
   - Metadata/headers format

3. **DAR Upload Method**
   - How to send the DAR file (streaming? base64? binary?)
   - Any required parameters

## Options for gRPC Client

### Option 1: grpcurl (Command Line)
```bash
grpcurl -H "authorization: Bearer <token>" \
  -d @ participant.dev.canton.wolfedgelabs.com:443 \
  <service>.<method> < request.json
```

### Option 2: Python gRPC Client
```python
import grpc
import admin_pb2
import admin_pb2_grpc

channel = grpc.secure_channel('participant.dev.canton.wolfedgelabs.com:443', credentials)
stub = admin_pb2_grpc.AdminServiceStub(channel)
# Upload DAR...
```

### Option 3: Node.js gRPC Client
```javascript
const grpc = require('@grpc/grpc-js');
const adminProto = require('./admin_pb');
// Upload DAR...
```

## Next Steps

1. ⏳ **Wait for client's script** - They will provide the exact method
2. ✅ **Update our scripts** - Once we see their approach
3. ✅ **Test with HelloWorld** - Deploy test contract first
4. ✅ **Verify deployment** - Confirm it works before main contracts

## Notes

- Client mentioned they were able to upload "without validator operator user"
- This suggests the admin API might have different authentication than JSON-API
- We should test with the simple HelloWorld contract first (as Mohak suggested)

