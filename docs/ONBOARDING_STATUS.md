# Onboarding Status

## Current Situation

**We cannot automatically onboard the user yet** because we don't have the **Wallet UI URL** from the client.

## What We've Done

1. ✅ **Created discovery script** (`scripts/check-wallet-ui.js`)
   - Checks common wallet UI endpoint locations
   - No wallet UI found at standard locations
   - Wallet UI is likely hosted separately or at a different domain

2. ✅ **Created onboarding script** (`scripts/onboard-user.js`)
   - Ready to use once we have the wallet UI URL
   - Will attempt to onboard via API if possible
   - Falls back to manual instructions if API onboarding isn't available

3. ✅ **Prepared JWT decode** for client
   - Keycloak User ID: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa`
   - All token details documented

## What We Need from Client

1. **Wallet UI URL**
   - The exact URL/endpoint for the wallet UI
   - Is it on the same domain or a different one?

2. **Onboarding Process**
   - Can onboarding be done via API/script?
   - Or must it be done through the web UI?
   - What are the exact steps?

3. **After Onboarding**
   - Do we need a new token?
   - How do we verify the user is onboarded?
   - What party ID will be assigned?

## Options Once We Have Wallet UI URL

### Option 1: Automated Onboarding (if API available)
```bash
# Set wallet UI URL
export WALLET_UI_URL="https://wallet.example.com"

# Get fresh token
.\scripts\get-keycloak-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"

# Run onboarding script
node scripts/onboard-user.js
```

### Option 2: Manual Onboarding (if web UI only)
1. Navigate to wallet UI URL
2. Log in with Keycloak credentials (`nico.builds@outlook.com`)
3. Complete onboarding process
4. Verify party ID is created

### Option 3: Browser Automation (if needed)
We can create a script using Puppeteer/Playwright to automate the web UI onboarding if the client prefers that approach.

## Next Steps

1. ⏭️ **Wait for client response** with wallet UI URL
2. ⏭️ **Update onboarding script** with correct URL
3. ⏭️ **Attempt onboarding** (automated or manual)
4. ⏭️ **Verify onboarding** worked
5. ⏭️ **Test JSON API** again with onboarded user

## User Information Ready

- **Keycloak User ID**: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa`
- **Email**: `nico.builds@outlook.com`
- **Name**: `Nico Chikuji`
- **Username**: `nico`

All information is ready - we just need the wallet UI URL to proceed!

