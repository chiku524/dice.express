# Token Lifetime Issue

## Problem

Canton may reject tokens with lifetime **exceeding 5 minutes** by default.

## Current Token

- **Lifetime**: 30 minutes (1800 seconds)
- **Status**: Valid, not expired
- **Issue**: May exceed Canton's default 5-minute limit

## Research Finding

According to Canton documentation:
> "Tokens with a lifetime exceeding 5 minutes are typically not accepted by default."

## Solution

### Option 1: Request Shorter-Lived Tokens

Modify the token request to specify a shorter lifetime:

```powershell
# In get-keycloak-token.ps1, add to request body:
$body = @{
    client_id = $ClientId
    username = $Username
    password = $Password
    grant_type = "password"
    # Add this to request shorter token lifetime
    # Note: Keycloak may not support this directly
}
```

### Option 2: Check Canton Configuration

The 5-minute limit may be configurable on Canton's side. Ask client:
- Is the token lifetime limit configurable?
- Can the limit be increased to 30 minutes?
- Or should we request tokens with shorter lifetime?

### Option 3: Token Refresh Strategy

Implement automatic token refresh:
1. Request new token every 4 minutes
2. Keep token lifetime under 5 minutes
3. Automatically refresh before expiration

## Testing

To test if this is the issue:

1. **Request a fresh token** (just created)
2. **Use it immediately** (within 1-2 minutes)
3. **Check if 403 error persists**

If the error goes away with a fresh token, the lifetime is likely the issue.

## Current Status

- ✅ Token format is correct
- ✅ Token scopes are correct
- ✅ Token audience is correct
- ❓ Token lifetime may be too long (30 minutes vs 5 minute default)

## Next Steps

1. Test with a freshly created token (use immediately)
2. If still fails, contact client about token lifetime configuration
3. Consider implementing token refresh strategy

