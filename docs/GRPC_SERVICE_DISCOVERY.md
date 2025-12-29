# gRPC Service Discovery

## Error Encountered

When trying to deploy, we got:
```
Error invoking method "com.daml.ledger.api.v1.admin.PackageManagementService/UploadDarFile": 
target server does not expose service "com.daml.ledger.api.v1.admin.PackageManagementService"
```

## Possible Issues

1. **Service name incorrect** - The service might have a different name
2. **Endpoint incorrect** - The admin API might be on a different endpoint
3. **Need to list services** - We should discover what services are available

## Next Steps

1. **List available services** using:
   ```bash
   grpcurl -insecure -H "authorization: Bearer <token>" \
     participant.dev.canton.wolfedgelabs.com:443 list
   ```

2. **Wait for client's script** - They mentioned they'll provide a script with the correct method

3. **Check Canton documentation** - Verify the correct service name for admin API

## Client's Script

The client said they'll provide a script. Once we receive it, we'll know:
- The correct service name
- The correct method name
- Any additional parameters needed
- The exact endpoint format

## Current Status

✅ grpcurl working  
✅ DAR file ready  
✅ Token obtained  
✅ Base64 encoding working  
❌ Service name incorrect - waiting for client's script

