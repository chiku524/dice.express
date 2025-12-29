# Wallet Address as Party ID

## Client Confirmation

**According to the client:**
> "The Party ID is the same as the wallet address"

## What This Means

- Your **Party ID** = Your **Wallet Address**
- When creating contracts, use your wallet address as the `actAs` party
- The wallet address is assigned during onboarding

## Finding Your Wallet Address

### Step 1: Log into Wallet UI

1. Open: `https://wallet.validator.dev.canton.wolfedgelabs.com`
2. Log in with your Keycloak credentials:
   - Email: `nico.builds@outlook.com`
   - Password: `Chikuji1!`

### Step 2: Find Your Wallet Address

Check these locations in the wallet UI:
- **Dashboard/Home page** - Often shows wallet address prominently
- **Account/Profile page** - May show account details including address
- **Wallet/Balance page** - Should show your wallet address
- **Settings** - May have account/wallet information

The wallet address should look like:
- A string of characters (hex format)
- Or a party name/identifier
- Example formats: `0x1234...`, `party::abc123`, or similar

## Using Your Wallet Address

### Option 1: Quick Test Script

Once you have your wallet address, test it immediately:

```bash
node scripts/test-with-wallet-address.js <your-wallet-address>
```

Example:
```bash
node scripts/test-with-wallet-address.js 0x1234567890abcdef
```

### Option 2: Environment Variable

Set it as an environment variable:

```bash
export PARTY_ID="your-wallet-address"
node scripts/setup-via-json-api.js
```

### Option 3: Update Scripts Directly

Edit `scripts/setup-via-json-api.js` and change:

```javascript
const ADMIN_PARTY = "your-wallet-address"
```

### Option 4: Command Line Parameter

```bash
node scripts/setup-via-json-api.js --party="your-wallet-address"
```

## Current Status

- ✅ **Authentication**: Working (400 instead of 403)
- ✅ **Onboarding**: Complete
- ✅ **Token**: Valid
- ⏭️ **Party ID**: Need wallet address from UI
- ⏭️ **Template ID**: May need format adjustment

## Next Steps

1. **Get wallet address** from wallet UI
2. **Test with wallet address**:
   ```bash
   node scripts/test-with-wallet-address.js <wallet-address>
   ```
3. **If successful**: Update all scripts to use wallet address
4. **If still errors**: May need template ID format adjustment

## Quick Reference

**Wallet UI**: `https://wallet.validator.dev.canton.wolfedgelabs.com`

**Test Script**: `scripts/test-with-wallet-address.js`

**Setup Script**: `scripts/setup-via-json-api.js`

**Environment Variable**: `PARTY_ID` or `ADMIN_PARTY`

---

Once you have your wallet address, we're ready to test contract creation! 🚀

