# Onboarding Success - Next Steps

## ✅ Great Progress!

**Authentication is now working!** 🎉

We're getting **400 "Invalid value for: body"** instead of **403 "invalid token"**, which means:
- ✅ User is onboarded
- ✅ Token is accepted by Canton
- ✅ Authentication is working
- ❌ Request format needs adjustment

## What We Need

### 1. Party ID

After onboarding, you should have been assigned a **party ID**. We need this to create contracts.

**Where to find it:**
- Check the wallet UI (`https://wallet.validator.dev.canton.wolfedgelabs.com`)
- Look in your profile/account settings
- It might be shown after onboarding completion
- It could be your username, email, or a generated ID

**Please provide:**
- What party ID/name was assigned to you?
- Or what does the wallet UI show as your party/account identifier?

### 2. Request Format

The 400 error suggests the request body format might need adjustment. We're currently using:
- `actAs: ["Admin"]` - but "Admin" might not be the correct party
- We need to use your actual party ID

## Next Steps

### Option 1: If you know your party ID

Update the scripts to use your party ID instead of "Admin":

```javascript
// In setup-via-json-api.js, change:
actAs: ["Admin"]  // Change this to your actual party ID
```

### Option 2: Try with username/email

We can try using your username or email as the party:

```javascript
actAs: ["nico"]  // or "nico.builds@outlook.com"
```

### Option 3: Get party ID from wallet UI

1. Log into wallet UI
2. Check your profile/account page
3. Look for "Party ID", "Party Name", or similar
4. Share that with us so we can update the scripts

## Current Status

- ✅ **Onboarding**: Complete
- ✅ **Authentication**: Working (no more 403!)
- ✅ **Token**: Valid and accepted
- ⏭️ **Party ID**: Need to identify your assigned party
- ⏭️ **Request Format**: May need adjustment based on party ID

## Quick Test

Once we have your party ID, we can test immediately:

```bash
# Update scripts with your party ID, then:
node scripts/setup-via-json-api.js
```

Or if you want to test manually, you can try using your username:

```bash
# Set party to your username
export PARTY_ID="nico"
node scripts/setup-via-json-api.js
```

## Questions

1. **What party ID/name was assigned to you during onboarding?**
2. **Does the wallet UI show your party ID anywhere?**
3. **Can you check the wallet UI and share what party identifier you see?**

Once we have the party ID, we're ready to create contracts! 🚀

