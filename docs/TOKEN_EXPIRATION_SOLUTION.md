# Token Expiration Solution

## The Problem

Canton/Keycloak tokens expire after a short period (typically 5-15 minutes). This causes:
- ❌ Users getting logged out frequently
- ❌ 401 authentication errors
- ❌ Poor user experience

## The Solution

We've implemented **proactive automatic token refresh** that:
- ✅ Checks token expiration every 15 seconds
- ✅ Refreshes tokens **2 minutes before expiration** (proactive)
- ✅ Uses refresh tokens to get new access tokens automatically
- ✅ Works silently in the background

## How It Works

### 1. Automatic Refresh Monitoring

The app automatically monitors token expiration:
- Checks every **15 seconds**
- Refreshes if token expires in less than **2 minutes**
- Uses the refresh token to get a new access token

### 2. Refresh Token Flow

```
1. User gets initial token (with refresh_token)
2. App stores both access_token and refresh_token
3. When access_token is about to expire:
   → App uses refresh_token to get new access_token
   → New token is stored automatically
   → User continues working seamlessly
```

### 3. Proactive Refresh

Instead of waiting for expiration, we refresh **2 minutes early**:
- Prevents expiration issues
- Ensures smooth user experience
- No interruptions during work

## Token Lifetime

**Note**: We **cannot change** the token expiration time set by the server (Keycloak). However:

✅ **Refresh tokens typically last much longer** (hours or days)
✅ **Automatic refresh** ensures you always have a valid token
✅ **Proactive refresh** prevents expiration issues

## What You'll See

### In Browser Console:
```
[TokenRefresh] Token expiring in 3m 45s, refreshing proactively...
[TokenRefresh] ✅ Token refreshed successfully
```

### If Refresh Fails:
```
[TokenRefresh] ❌ Failed to refresh token: ...
```

## Manual Refresh

If automatic refresh fails, you can manually refresh:
1. Open Wallet Modal
2. Click "Get Token from Keycloak" (if you have username/password)
3. Or enter a new token manually

## Troubleshooting

### "No refresh token available" error
- **Cause**: Initial token didn't include a refresh token
- **Solution**: Get a new token using username/password (this includes refresh token)

### Token keeps expiring
- **Cause**: Refresh token might have expired
- **Solution**: Get a new token using username/password

### Refresh fails repeatedly
- **Cause**: Refresh token expired or invalid
- **Solution**: Get a new token using username/password

## Best Practices

1. **Always use username/password** to get initial token (includes refresh token)
2. **Don't manually enter tokens** unless necessary (they might not have refresh tokens)
3. **Let automatic refresh work** - it handles everything in the background

## Technical Details

### Refresh Check Frequency
- **Every 15 seconds**: Checks if token needs refresh
- **2 minute buffer**: Refreshes before expiration

### Token Storage
- `canton_token`: Current access token
- `canton_refresh_token`: Refresh token (for getting new access tokens)
- `canton_token_expires_at`: When current token expires

### Refresh Endpoint
- Uses `/api/refresh-token` endpoint
- Sends refresh_token to Keycloak
- Receives new access_token and refresh_token

## Summary

✅ **Automatic refresh is enabled** - tokens refresh automatically
✅ **Proactive refresh** - refreshes 2 minutes before expiration
✅ **Silent operation** - works in background without user intervention
✅ **Seamless experience** - users don't notice token refreshes

**You don't need to do anything** - the system handles token refresh automatically!