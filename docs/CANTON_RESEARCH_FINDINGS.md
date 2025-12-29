# Canton Network Research Findings

## Overview

Research findings on Canton JSON API, contract creation, queries, and deployment best practices.

## Authentication & Authorization

### Token Requirements

1. **Token Lifetime**
   - Tokens with lifetime **exceeding 5 minutes may not be accepted by default**
   - Our tokens are valid for 30 minutes, which might be the issue
   - **Action**: Request tokens with shorter lifetime or check Canton configuration

2. **Token Scopes**
   - Required: `daml_ledger_api` ✅ (we have this)
   - May also need: `profile`, `email`

3. **Token Audience**
   - Must match Canton's expected audience
   - Our token has: `https://canton.network.global, account`
   - Canton might expect a specific audience for JSON API

4. **Token Format**
   - Must be JWT format ✅
   - Must include in `Authorization: Bearer <token>` header ✅

### Security Best Practices

- **TLS**: Must be enabled on APIs receiving tokens
- **Token Storage**: Store tokens securely in memory
- **Token Management**: Manage token lifetimes appropriately
- **Mutual TLS**: Recommended for Admin API

## JSON API Endpoints

### Command Submission

**Endpoint**: `/v2/commands/submit-and-wait`

**Request Format**:
```json
{
  "actAs": ["Party1", "Party2"],
  "commandId": "unique-command-id",
  "applicationId": "application-id",
  "commands": [
    {
      "CreateCommand": {
        "templateId": "Module:Template",
        "createArguments": {
          "field1": "value1",
          "field2": "value2"
        }
      }
    }
  ]
}
```

**Response Format**:
```json
{
  "result": {
    "created": [
      {
        "contractId": "contract-id",
        "templateId": "Module:Template",
        "payload": { ... }
      }
    ],
    "exercised": [],
    "events": []
  }
}
```

### Query Contracts

**Endpoint**: `/v2/query` or `/v1/query`

**Request Format**:
```json
{
  "templateIds": ["Module:Template"],
  "query": {
    "field": "value"
  }
}
```

**Response Format**:
```json
{
  "result": [
    {
      "contractId": "contract-id",
      "templateId": "Module:Template",
      "payload": { ... }
    }
  ]
}
```

## Deployment

### Admin API (gRPC)

**Endpoint**: `participant.dev.canton.wolfedgelabs.com:443` or `participant.dev.canton.wolfedgelabs.com/admin-api`

**Service**: `com.digitalasset.canton.admin.participant.v30.PackageService/UploadDar`

**Request Format**:
```json
{
  "dars": [
    {
      "bytes": "<base64-encoded-dar-file>",
      "description": "DAR file description"
    }
  ],
  "vet_all_packages": false,
  "synchronize_vetting": false
}
```

### Best Practices

1. **Use gRPC for deployments** (more reliable)
2. **Use JSON API for contract operations** (queries, commands)
3. **Enable TLS** on all APIs
4. **Use JWT tokens** for authentication
5. **Manage token lifetimes** appropriately

## Common Issues & Solutions

### 403 "Invalid Token"

**Possible Causes**:
1. Token lifetime > 5 minutes (default limit)
2. Token audience mismatch
3. Missing required scopes
4. Token validation configuration issue

**Solutions**:
1. Request tokens with shorter lifetime (< 5 minutes)
2. Verify token audience matches Canton's expectations
3. Ensure all required scopes are present
4. Contact client to verify token validation configuration

### 400 "Invalid value for: body"

**Possible Causes**:
1. Request format incorrect
2. Missing required fields
3. Field type mismatches

**Solutions**:
1. Verify request format matches Canton's expected format
2. Check all required fields are present
3. Verify field types match template definitions

### 404 "Endpoint not found"

**Possible Causes**:
1. Wrong endpoint path
2. API not enabled on Canton
3. Version mismatch

**Solutions**:
1. Verify endpoint path is correct
2. Check if JSON API is enabled on Canton
3. Try different API versions (v1 vs v2)

## Resources

- **Canton Documentation**: https://docs.digitalasset.com
- **Canton Security Guide**: https://docs.digitalasset.com/overview/3.3/explanations/canton/security.html
- **Canton Quickstart**: https://github.com/digital-asset/cn-quickstart
- **Secure Canton Infrastructure**: https://github.com/digital-asset/ex-secure-canton-infra

## Key Takeaways

1. **Token lifetime** may be the issue (5 minute default limit)
2. **JSON API format** is well-documented
3. **Security** is critical - enable TLS, manage tokens properly
4. **gRPC for deployment**, **JSON API for operations**
5. **Version compatibility** matters - check API versions

