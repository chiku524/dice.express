# DAML Script Test Results

## Test Date
December 29, 2025

## Test Attempts

### Attempt 1: Basic Connection
**Command**:
```bash
daml script \
  --dar .daml/dist/prediction-markets-1.0.0.dar \
  --script-name Setup:setup \
  --ledger-host participant.dev.canton.wolfedgelabs.com \
  --ledger-port 443 \
  --access-token-file token.json \
  --tls
```

**Result**: ❌ **Connection Reset**
- Error: `java.net.SocketException: Connection reset`
- TLS was not explicitly enabled

### Attempt 2: With TLS Explicitly Enabled
**Command**:
```bash
daml script \
  --dar .daml/dist/prediction-markets-1.0.0.dar \
  --script-name Setup:setup \
  --ledger-host participant.dev.canton.wolfedgelabs.com \
  --ledger-port 443 \
  --access-token-file token.json \
  --tls
```

**Result**: ⚠️ **Partial Success - API Version Mismatch**

**Progress**:
- ✅ Connection established (TLS working)
- ✅ Token read successfully
- ✅ TLS protocols enabled (TLSv1.3, TLSv1.2)

**Error**:
```
UNIMPLEMENTED: Method not found: com.daml.ledger.api.v2.StateService/GetLedgerEnd
```

**Analysis**:
- DAML Script is trying to use **v2 API** (`com.daml.ledger.api.v2.StateService`)
- Canton devnet appears to only support **v1 API**
- The gRPC connection works, but the API methods don't match

## Key Findings

1. **Connection Works**: TLS connection to port 443 is successful
2. **Authentication Works**: Token is being read and sent
3. **API Version Mismatch**: DAML Script SDK 3.4.9 uses v2 API, but Canton devnet uses v1 API

## Possible Solutions

### Option 1: Use Older DAML SDK
Try using DAML SDK 2.x which uses v1 API:
- SDK 2.10.0 or earlier
- May require rebuilding DAR file with older SDK

### Option 2: Contact Client
Ask client about:
- Which DAML SDK version should we use?
- Does Canton devnet support v2 API?
- Is there a different endpoint for v1 API?

### Option 3: Use JSON API Instead
Since JSON API is available (even if it has issues), we could:
- Fix the JSON API request format
- Use the Vercel proxy routes
- Work around the 400 errors

## Token File Format Issue

**Problem**: `token.json` contains full JSON response, but DAML Script expects just the token string.

**Solution**: Created `scripts/extract-token.ps1` to extract `access_token` to `token.txt`

## Next Steps

1. ✅ **Token extraction script created** - `scripts/extract-token.ps1`
2. ⏭️ **Try with older SDK** - If available, test with SDK 2.x
3. ⏭️ **Contact client** - Ask about API version compatibility
4. ⏭️ **Fallback to JSON API** - Continue working on JSON API scripts

## Error Details

### Full Error
```
Exception in thread "main" io.grpc.StatusRuntimeException: UNIMPLEMENTED: Method not found: 
com.daml.ledger.api.v2.StateService/GetLedgerEnd
```

### What This Means
- The gRPC service exists and is reachable
- The specific method `GetLedgerEnd` from v2 API doesn't exist
- Canton likely only implements v1 API methods

## Recommendations

**Immediate**: Contact client to ask:
1. "DAML Script SDK 3.4.9 uses v2 API, but Canton returns 'Method not found' for v2 methods. Does Canton devnet support v2 API, or should we use SDK 2.x?"

**Alternative**: Continue with JSON API approach and fix the 400 errors (party allocation, template ID format, etc.)

