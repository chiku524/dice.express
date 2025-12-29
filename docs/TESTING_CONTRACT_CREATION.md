# Testing Contract Creation on Canton

This guide walks through testing contract creation on Canton after deployment.

## Prerequisites

- ✅ DAR file deployed to Canton (Package ID: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`)
- Node.js installed
- PowerShell (for Windows) or Bash (for Linux/Mac)

## Step 1: Verify Package Deployment

First, verify that the package is available on the ledger:

```bash
node scripts/verify-package.js
```

This script will:
- Query Canton's packages endpoint to verify the package ID
- Attempt to query for templates from the package
- Report success or failure

**Expected Output:**
- Package found in packages list, OR
- Template query succeeds (indicating package is available)

## Step 2: Create TokenBalance Contract

Before creating `MarketConfig`, we need a `TokenBalance` contract (stablecoin):

```bash
node scripts/create-token-balance.js
```

This creates a USDC token balance for the admin party.

**Expected Output:**
- Contract ID of the created `TokenBalance`
- Save this contract ID for the next step

**Note:** The script will output the contract ID. Save it:
```bash
export TOKEN_BALANCE_CID="<contract-id-from-output>"
```

## Step 3: Create MarketConfig Contract

Now create the `MarketConfig` contract using the token balance:

```bash
# Set the token balance contract ID
export TOKEN_BALANCE_CID="<contract-id-from-step-2>"

# Create MarketConfig
node scripts/create-market-config.js
```

**Expected Output:**
- `MarketConfig` contract created successfully
- Contract ID of the created `MarketConfig`

## Step 4: Run All Tests (PowerShell)

On Windows, you can run all steps at once:

```powershell
.\scripts\test-contract-creation.ps1
```

This script will:
1. Verify the package is deployed
2. Create a `TokenBalance` contract
3. Extract the contract ID
4. Create a `MarketConfig` contract using the token balance

**With Custom Parties:**
```powershell
.\scripts\test-contract-creation.ps1 -AdminParty "YourAdminParty" -OracleParty "YourOracleParty"
```

## Troubleshooting

### Error: "Party not allocated"

If you get an error about the party not being allocated:

1. **Check party allocation**: The party must be allocated on Canton before creating contracts
2. **Use correct party name**: Ensure the party name matches what's allocated on Canton
3. **Contact Canton admin**: You may need to request party allocation

### Error: "Template not found"

If you get an error about the template not being found:

1. **Verify package deployment**: Run `verify-package.js` to confirm the package is deployed
2. **Check template ID**: Ensure the template ID matches: `PredictionMarkets:MarketConfig` or `Token:TokenBalance`
3. **Check package ID**: Verify the package ID matches the deployed package

### Error: "stablecoinCid is required"

If you get this error when creating `MarketConfig`:

1. **Create TokenBalance first**: Run `create-token-balance.js` before creating `MarketConfig`
2. **Set environment variable**: Ensure `TOKEN_BALANCE_CID` is set correctly
3. **Check contract ID format**: The contract ID should be a valid Canton contract ID

### Error: "415 Unsupported Media Type"

If you get a 415 error:

1. **Check Content-Type header**: The API should set this automatically
2. **Verify endpoint**: Ensure the JSON API endpoint is correct
3. **Check request format**: The request body should be valid JSON

### Error: "401 Unauthorized"

If you get a 401 error:

1. **Authentication required**: Some Canton deployments require authentication
2. **Get token**: You may need to obtain a Bearer token from Keycloak
3. **Add Authorization header**: Include the token in the request headers

## Next Steps

After successfully creating contracts:

1. ✅ **Verify contracts exist**: Query the ledger to confirm contracts are created
2. ⏭️ **Test Market Creation**: Create a market from the frontend
3. ⏭️ **Test AMM Operations**: Test liquidity pool operations

## Scripts Reference

- `scripts/verify-package.js` - Verify package is deployed
- `scripts/create-token-balance.js` - Create TokenBalance contract
- `scripts/create-market-config.js` - Create MarketConfig contract
- `scripts/test-contract-creation.ps1` - Run all tests (PowerShell)

## Environment Variables

- `LEDGER_URL` - Canton JSON API URL (default: `https://participant.dev.canton.wolfedgelabs.com/json-api`)
- `ADMIN_PARTY` - Admin party name (default: `Admin`)
- `ORACLE_PARTY` - Oracle party name (default: `Oracle`)
- `TOKEN_BALANCE_CID` - Contract ID of TokenBalance (required for MarketConfig)

