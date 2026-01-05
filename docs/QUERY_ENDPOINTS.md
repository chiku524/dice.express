# Query Endpoints in Canton JSON API

## Summary

**Query endpoints do NOT exist in the Canton JSON API** per the official OpenAPI documentation. This is by design, not a configuration issue.

## What Are Query Endpoints?

Query endpoints would allow you to search and retrieve contracts from the Canton ledger based on:
- Template ID
- Party (signatory/observer)
- Custom filters
- Contract state

## Why They Don't Exist

The Canton JSON API is designed for **command submission only**, not contract querying. This is intentional for:
1. **Security**: Reduces attack surface
2. **Performance**: Command submission is optimized
3. **Architecture**: Querying requires different protocols

## Alternatives

### Option 1: Use Database (Current Implementation) ✅
- Store contracts in Supabase database
- Query database instead of ledger
- Works reliably and efficiently

### Option 2: Use gRPC API
- Requires gRPC client setup
- More complex but provides full query capabilities
- Requires different authentication

### Option 3: Use WebSocket
- Real-time contract updates
- Requires WebSocket connection management
- More complex than HTTP

### Option 4: Request Enablement (Future)
- Contact Canton administrator
- Request query endpoint enablement (if available)
- May require infrastructure changes

## Current Status

✅ **Database-first approach** - Contracts stored in Supabase  
✅ **Command submission works** - Can create contracts via JSON API  
❌ **Query endpoints unavailable** - Not part of JSON API design  

## Impact

- Markets are stored in database after creation
- Contract history uses database queries
- Admin dashboard uses database queries
- Portfolio uses database queries

This approach is actually **more reliable** than query endpoints because:
- No dependency on ledger query capabilities
- Faster queries
- Better error handling
- Easier to implement

## Conclusion

Query endpoints are not available in the JSON API, but this is not a limitation. The database-first approach provides better reliability and performance for the application's needs.
