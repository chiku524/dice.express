# Action Plan: Next Steps for Contract Creation

## Current Status

✅ **Completed:**
- DAR file deployed to Canton (Package ID: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`)
- Testing scripts created
- Setup.daml script completed

❌ **Blocked:**
- JSON API contract creation failing with 400 error
- Party allocation status unknown
- Authentication requirements unclear

## Immediate Next Steps (What You Can Do)

### Option 1: Use DAML Script (Recommended - No Client Help Needed)

**Advantage**: DAML Script handles party allocation automatically and doesn't require JSON API authentication.

**Steps:**
1. **Run the Setup Script**:
   ```bash
   daml script \
     --dar .daml/dist/prediction-markets-1.0.0.dar \
     --script-name Setup:setup \
     --ledger-host participant.dev.canton.wolfedgelabs.com \
     --ledger-port 443 \
     --access-token-file token.json
   ```

2. **Get Authentication Token** (if required):
   ```powershell
   .\scripts\get-keycloak-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"
   ```

3. **Verify Script Success**:
   - Check output for contract IDs
   - Script will create TokenBalance and MarketConfig automatically

**Why This Works:**
- DAML Script allocates parties automatically
- Handles authentication via token file
- Uses gRPC (more reliable than JSON API)
- No need to format JSON requests manually

### Option 2: Contact Client for Information

**Questions to Ask:**
1. **Party Allocation**: 
   - Is the party "Admin" allocated on Canton?
   - What parties are available?
   - How do we allocate new parties?

2. **Template ID Format**:
   - Should template IDs include package ID? (e.g., `package-id:Token:TokenBalance`)
   - Or just module:template? (e.g., `Token:TokenBalance`)

3. **Authentication**:
   - Is authentication required for JSON API?
   - Should we use the same Keycloak token for JSON API?

4. **JSON API Endpoints**:
   - Which endpoints are enabled? (`/v2/commands/submit-and-wait` vs `/v1/command`)
   - What's the correct request format?

### Option 3: Improve JSON API Scripts

**What We Can Do:**
1. Add authentication support to scripts
2. Try different template ID formats
3. Add better error handling and logging
4. Test with different party names

## Recommended Approach

**Priority 1: Try DAML Script** (Do this first)
- Most likely to work without client help
- Handles party allocation automatically
- Better error messages

**Priority 2: Contact Client** (If DAML Script fails)
- Get party allocation info
- Verify template ID format
- Confirm authentication requirements

**Priority 3: Improve JSON API** (After getting info)
- Add authentication
- Fix template ID format
- Test with correct parties

## Step-by-Step: Try DAML Script Now

### Step 1: Get Authentication Token
```powershell
.\scripts\get-keycloak-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"
```

### Step 2: Check if daml script command works
```bash
daml script --help
```

### Step 3: Run Setup Script
```bash
# If authentication is required:
daml script \
  --dar .daml/dist/prediction-markets-1.0.0.dar \
  --script-name Setup:setup \
  --ledger-host participant.dev.canton.wolfedgelabs.com \
  --ledger-port 443 \
  --access-token-file token.json

# If no authentication needed:
daml script \
  --dar .daml/dist/prediction-markets-1.0.0.dar \
  --script-name Setup:setup \
  --ledger-host participant.dev.canton.wolfedgelabs.com \
  --ledger-port 443
```

### Step 4: Check Results
- Look for contract IDs in output
- Verify contracts were created
- Note any errors

## If DAML Script Doesn't Work

### Check DAML SDK Installation
```bash
daml version
daml script --help
```

### Check Network Connectivity
```bash
# Test if you can reach Canton
curl -I https://participant.dev.canton.wolfedgelabs.com
```

### Check Token File
```bash
# Verify token.json exists and has valid token
cat token.json
```

## What to Report to Client

If DAML Script also fails, provide:
1. **Error message** from DAML Script
2. **Command used** (with sensitive info redacted)
3. **Network connectivity** status
4. **Token status** (if using authentication)

## Success Criteria

✅ **Setup Complete When:**
- TokenBalance contract created
- MarketConfig contract created
- Contract IDs obtained
- Ready to test market creation from frontend

## Files Updated

- ✅ `daml/Setup.daml` - Complete setup script
- ✅ `docs/ACTION_PLAN.md` - This action plan

## Next After Setup

Once contracts are created:
1. Test market creation from frontend
2. Test AMM operations
3. Test position creation
4. Test market resolution

