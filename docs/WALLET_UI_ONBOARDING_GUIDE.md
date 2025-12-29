# Wallet UI Onboarding Guide

## Wallet UI URL

**URL**: `https://wallet.validator.dev.canton.wolfedgelabs.com`

## Onboarding Steps

### Step 1: Access Wallet UI

1. Open your browser
2. Navigate to: `https://wallet.validator.dev.canton.wolfedgelabs.com`

### Step 2: Log In

1. Click "Log In" or "Sign In"
2. Use your Keycloak credentials:
   - **Email**: `nico.builds@outlook.com`
   - **Password**: `Chikuji1!`

### Step 3: Complete Onboarding

1. Follow the onboarding process in the wallet UI
2. This will map your Keycloak user ID to a Canton party
3. **Keycloak User ID**: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa`
4. Wait for the onboarding to complete
5. Note the party ID that gets assigned (if shown)

### Step 4: Verify Onboarding

After onboarding, verify it worked by:

1. **Get a fresh token**:
   ```powershell
   .\scripts\request-new-token.ps1
   ```

2. **Test JSON API**:
   ```powershell
   .\scripts\test-fresh-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"
   ```

3. **Or test contract creation**:
   ```powershell
   .\scripts\unified-setup.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"
   ```

## What Happens During Onboarding

- Keycloak user ID (`ee15aa3d-0bd4-44f9-9664-b49ad7e308aa`) gets mapped to a Canton party
- A party ID is created for your user
- Your JWT token will now be recognized by Canton's JSON API
- You'll be able to create contracts and interact with the ledger

## After Onboarding

### Get Fresh Token

```powershell
.\scripts\request-new-token.ps1
```

This will:
- Request a new JWT token from Keycloak
- Extract it to `token.txt` for easy access
- Verify the token is valid

### Test JSON API

Once you have a fresh token, test the JSON API:

```powershell
.\scripts\test-fresh-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"
```

If onboarding was successful, you should see:
- ✅ Status 200 or 201 (instead of 403)
- ✅ Contract created successfully
- ✅ Contract ID returned

## Troubleshooting

### Still Getting 403 After Onboarding

1. **Get a fresh token** - The old token might not have the party mapping
   ```powershell
   .\scripts\request-new-token.ps1
   ```

2. **Verify token** - Check if token is valid
   ```bash
   node scripts/verify-token.js
   ```

3. **Check onboarding status** - Verify you completed onboarding
   - Log back into wallet UI
   - Check if party ID is shown
   - Verify user profile shows onboarding complete

### Can't Access Wallet UI

- Check if URL is correct: `https://wallet.validator.dev.canton.wolfedgelabs.com`
- Try in incognito/private browsing mode
- Clear browser cache
- Check network connectivity

### Onboarding Process Not Clear

- Look for "Onboard", "Get Started", or "Create Account" buttons
- Check for any welcome/onboarding wizard
- Contact client if onboarding process is unclear

## Quick Reference

**Wallet UI**: `https://wallet.validator.dev.canton.wolfedgelabs.com`  
**Email**: `nico.builds@outlook.com`  
**Keycloak User ID**: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa`

**After onboarding, run**:
```powershell
.\scripts\request-new-token.ps1
```

