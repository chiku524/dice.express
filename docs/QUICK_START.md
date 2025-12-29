# Quick Start: Create Contracts on Canton

## 🎯 Goal
Create TokenBalance and MarketConfig contracts on Canton so you can test market creation from the frontend.

## ✅ What's Ready
- ✅ DAR file deployed to Canton
- ✅ Setup.daml script completed (creates both contracts)
- ✅ Helper scripts created

## 🚀 Try This First: DAML Script (Recommended)

### Option A: With Authentication (If Required)

```powershell
# Step 1: Get token
.\scripts\get-keycloak-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"

# Step 2: Run setup script
.\scripts\run-setup-script.ps1 -Password "Chikuji1!"
```

### Option B: Without Authentication (If Not Required)

```powershell
.\scripts\run-setup-script.ps1
```

### What This Does
1. ✅ Allocates parties (Admin, Oracle)
2. ✅ Creates TokenBalance contract (1M USDC)
3. ✅ Creates MarketConfig contract
4. ✅ Returns contract IDs

## 📋 Manual Steps (If Script Doesn't Work)

### Step 1: Get Authentication Token
```powershell
.\scripts\get-keycloak-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"
```

### Step 2: Run DAML Script
```bash
daml script \
  --dar .daml/dist/prediction-markets-1.0.0.dar \
  --script-name Setup:setup \
  --ledger-host participant.dev.canton.wolfedgelabs.com \
  --ledger-port 443 \
  --access-token-file token.json
```

## ❌ If DAML Script Fails

### Check These:

1. **DAML SDK Installed?**
   ```bash
   daml version
   ```
   - If not found, open a new terminal or check PATH

2. **DAR File Built?**
   ```bash
   daml build
   ```

3. **Network Connectivity?**
   ```bash
   curl -I https://participant.dev.canton.wolfedgelabs.com
   ```

4. **Token Valid?**
   ```bash
   cat token.json
   ```

### Contact Client If:
- DAML Script fails with authentication errors
- Party allocation fails
- Network connectivity issues
- Need clarification on:
  - Party names to use
  - Authentication requirements
  - Template ID format

## ✅ Success Looks Like

```
Contracts created:
  - TokenBalance (stablecoin)
  - MarketConfig

You can now test market creation from the frontend!
```

## 🎯 Next After Success

1. **Test Market Creation** (Frontend)
   - Open frontend
   - Connect wallet
   - Create a market

2. **Test AMM Operations**
   - Create liquidity pool
   - Add liquidity
   - Test swaps

## 📚 More Information

- `docs/ACTION_PLAN.md` - Detailed action plan
- `docs/CONTRACT_CREATION_TEST_RESULTS.md` - Test results
- `docs/TESTING_CONTRACT_CREATION.md` - Testing guide

