# Ledger API Research Findings

## Research Summary

Based on web research, here's what we found about Canton Ledger API endpoints:

## Key Findings

### 1. Ledger API vs JSON API vs Admin API

**Three Different APIs:**

| API Type | Protocol | Purpose | Endpoint |
|----------|----------|---------|----------|
| **Admin API** | gRPC | DAR uploads, admin operations | `participant.dev.canton.wolfedgelabs.com:443` or `/admin-api` ✅ Known |
| **JSON API** | HTTP/JSON | Contract queries, commands | `participant.dev.canton.wolfedgelabs.com/json-api` ✅ Known |
| **Ledger API** | gRPC | DAML Script, SDK operations | ❓ **Unknown** |

### 2. Ledger API Characteristics

**From Research:**
- **Protocol**: gRPC-based interface
- **Purpose**: Core interface for DAML Script, SDK operations
- **Services**: Command Submission, Transaction Service, Active Contracts, Party Management, etc.
- **Default Ports** (typical):
  - Port **6865** - Common default for Ledger API
  - Port **5011** - Alternative common port
  - Port **443** - HTTPS (may be used with TLS)

### 3. JSON API Connection to Ledger API

**Important Discovery:**
The JSON API service connects **to** the Ledger API. From documentation examples:

```hocon
{
  server {
    address = "localhost"
    port = 7575  // JSON API port
  }
  ledger-api {
    address = "localhost"
    port = 6865  // Ledger API port (internal)
  }
}
```

**This suggests:**
- JSON API is a **proxy/wrapper** around Ledger API
- Ledger API may be **internal** (not directly exposed)
- JSON API might be the **only public way** to access Ledger API functionality

### 4. Canton Version Differences

**API Version Support:**
- **Canton 2.x**: Supports Ledger API **v1** endpoints
- **Canton 3.x**: Supports Ledger API **v2** endpoints

### 5. Typical Configuration

**Common Setup:**
- Ledger API: Usually on port **6865** (internal)
- JSON API: Usually on port **7575** (public HTTP)
- Admin API: Usually on port **443** or **5011** (gRPC)

**However**, in your case:
- Admin API: `participant.dev.canton.wolfedgelabs.com:443` ✅
- JSON API: `participant.dev.canton.wolfedgelabs.com/json-api` ✅
- Ledger API: **Not directly exposed** ❓

## Why DAML Script Might Not Work

### Hypothesis

1. **Ledger API Not Exposed Publicly**
   - The Ledger API (gRPC) might only be accessible internally
   - JSON API acts as the public-facing interface
   - DAML Script requires direct gRPC access to Ledger API

2. **Different Endpoint Required**
   - Ledger API might be at a different host/port
   - Might require special configuration or VPN access
   - Client might need to expose it separately

3. **TLS/SSL Configuration**
   - Ledger API might require TLS with specific certificates
   - Connection might need additional authentication layers

## Possible Solutions

### Option 1: Ask Client to Expose Ledger API

**Request:**
- Expose Ledger API (gRPC) endpoint
- Provide host and port
- Confirm if TLS is required

### Option 2: Use JSON API (Recommended)

**Why:**
- ✅ Already working (authentication confirmed)
- ✅ Publicly accessible
- ✅ Only need template ID format
- ✅ Simpler for web applications

**What We Need:**
- Correct template ID format
- Example working request

### Option 3: Use JSON API as Proxy

**If Ledger API is internal:**
- JSON API might proxy Ledger API requests
- Could potentially work through JSON API
- But DAML Script requires direct gRPC connection

## Testing Suggestions

### Try These Endpoints:

1. **Standard Ports:**
   - `participant.dev.canton.wolfedgelabs.com:6865` (common Ledger API port)
   - `participant.dev.canton.wolfedgelabs.com:5011` (alternative)

2. **With TLS:**
   - `participant.dev.canton.wolfedgelabs.com:443` (with TLS)
   - Might need `--tls` flag in DAML Script

3. **Different Path:**
   - `participant.dev.canton.wolfedgelabs.com/ledger-api` (if exposed like Admin API)

### Use grpcurl to Test

If you have `grpcurl` installed, you can test if Ledger API is accessible:

```bash
grpcurl -plaintext participant.dev.canton.wolfedgelabs.com:6865 list
```

Or with TLS:
```bash
grpcurl participant.dev.canton.wolfedgelabs.com:443 list
```

## Recommendations

### Immediate Action

1. **Continue with JSON API approach** (most likely to work)
   - Wait for client's template ID format
   - This is the recommended path

2. **Ask client about Ledger API** (if DAML Script is preferred)
   - Is Ledger API exposed?
   - What is the endpoint?
   - Is TLS required?

### Long-term

- JSON API is better for web applications
- DAML Script is better for automation/scripts
- Both can work, but JSON API is already partially working

## References

- [Daml Ledger API Documentation](https://docs.daml.com/app-dev/ledger-api.html)
- [Daml JSON API Documentation](https://docs.daml.com/json-api/index.html)
- [Daml Developers Community - Ledger API v2](https://discuss.daml.com/t/ledger-api-v2-endpoints/7358)

## Conclusion

**Most Likely Scenario:**
- Ledger API is **not publicly exposed**
- JSON API is the **intended public interface**
- DAML Script requires **direct gRPC access** which may not be available

**Best Path Forward:**
- Continue with **JSON API** approach
- Wait for client's **template ID format**
- This is the most practical solution

