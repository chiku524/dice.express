# 415 Error Troubleshooting

## Error: "Content-Type 'application/json' is not supported"

### What This Means

A 415 error indicates the server cannot process the request because the media type is not supported. However, in our case, we ARE sending `application/json` correctly.

### Possible Causes

1. **Vercel Deployment Cache**: The old version of the API handler might be cached
2. **Vercel Body Parser**: Vercel might not be parsing the body correctly
3. **Request Format**: The request might not be reaching our handler

### Solutions

#### Solution 1: Wait for Deployment (Recommended)

The fix has been deployed. Wait a few minutes for Vercel to update the serverless function, then try again.

#### Solution 2: Clear Browser Cache

1. Hard refresh the page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Or clear browser cache and reload

#### Solution 3: Check Vercel Logs

1. Go to Vercel Dashboard
2. Navigate to your project
3. Go to "Functions" tab
4. Check logs for `/api/command`
5. Look for the debug logs we added

#### Solution 4: Verify Request Format

The frontend should be sending:
```json
{
  "actAs": ["party-id"],
  "commandId": "test-...",
  "applicationId": "prediction-markets",
  "commands": [{
    "CreateCommand": {
      "templateId": "Token:TokenBalance",
      "createArguments": {...}
    }
  }]
}
```

With headers:
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Current Status

- ✅ Code fixed (removed Content-Type validation that was causing 415)
- ✅ Body parsing simplified (using Vercel's auto-parsed body)
- ⏳ Waiting for Vercel deployment to update

### Next Steps

1. Wait 2-3 minutes for Vercel to deploy the new version
2. Hard refresh the page (`Ctrl+Shift+R`)
3. Try the contract buttons again
4. If still failing, check Vercel function logs

### If Error Persists

If the 415 error persists after deployment:
1. Check Vercel function logs for our debug messages
2. Verify the request is reaching our handler
3. Check if `req.body` is being parsed correctly

The error message format suggests it might be coming from Vercel's runtime, not our code. The latest code should handle this correctly.

