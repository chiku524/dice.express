# Viewing Contracts and Markets on Canton Devnet Explorer

## Block Explorer URL

**🔗 Direct Link**: [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)

---

## Quick Search Methods

### 1. View All Contracts for Your Party

**Your Party ID**: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`

**Steps:**
1. Go to [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. Use the search bar at the top
3. Paste your full party ID: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
4. Click search or press Enter
5. View all contracts created by/for your party

**What you'll see:**
- All `MarketCreationRequest` contracts you created
- All `Market` contracts (after approval)
- All `TokenBalance` contracts
- All other contracts associated with your party

---

### 2. View All Contracts from Your Package

**Package ID**: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`

**Steps:**
1. Go to [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. Search for: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
3. This will show the package and all contracts created from it

**What you'll see:**
- Package information
- All templates in the package
- All contracts created from those templates

---

### 3. View Specific Contract by Contract ID

If you have a contract ID from a successful creation response:

**Steps:**
1. Go to [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. Search for the contract ID (format: `00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00#12345`)
3. View contract details, state, and transaction history

**How to get contract IDs:**
- From successful market creation responses in the browser console
- From the "Create Market" success message (if contract ID is displayed)
- From API responses when creating contracts

---

### 4. View MarketCreationRequest Contracts

**Template**: `PredictionMarkets:MarketCreationRequest`

**Steps:**
1. Go to [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. Search for your party ID (see method 1 above)
3. Filter or browse to find `MarketCreationRequest` contracts
4. Click on a contract to see:
   - Market title and description
   - Creator and admin parties
   - Market type (Binary/MultiOutcome)
   - Deposit amount
   - Settlement trigger details
   - Contract state

---

### 5. View Market Contracts (Approved Markets)

**Template**: `PredictionMarkets:Market`

**Steps:**
1. Go to [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. Search for your party ID
3. Look for contracts with template `PredictionMarkets:Market`
4. These are markets that have been approved and are active

**What you'll see:**
- Market status (Active, Resolving, Settled)
- Total volume
- Yes/No volumes (for binary markets)
- All positions
- Resolution data (if resolved)

---

## Direct Links (Copy-Paste Ready)

### Search by Party ID
```
https://devnet.ccexplorer.io/?q=ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292
```

### Search by Package ID
```
https://devnet.ccexplorer.io/?q=b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0
```

### Search by Package Name
```
https://devnet.ccexplorer.io/?q=prediction-markets
```

---

## What Information is Available

### For Each Contract, You Can See:

1. **Contract Details**
   - Contract ID
   - Template ID (e.g., `PredictionMarkets:Market`)
   - Package ID
   - Created timestamp

2. **Contract Payload**
   - All contract fields and values
   - For `MarketCreationRequest`: title, description, marketType, etc.
   - For `Market`: status, volumes, positions, etc.

3. **Transaction History**
   - When the contract was created
   - Any choices exercised on the contract
   - Contract state changes

4. **Party Information**
   - Signatories
   - Observers
   - Who can exercise choices

---

## Tips for Finding Your Markets

### Method 1: Search by Party (Recommended)
1. Search for your party ID
2. Browse all contracts
3. Look for `MarketCreationRequest` and `Market` contracts

### Method 2: Search by Package
1. Search for package ID or name
2. View all contracts from that package
3. Filter by template type

### Method 3: Use Contract IDs
1. When you create a market, save the contract ID from the response
2. Search for that specific contract ID
3. View its details and state

---

## Example: Finding Your Created Markets

Since you mentioned you successfully created 2 markets:

1. **Go to**: [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. **Search for**: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
3. **Look for contracts with template**:
   - `PredictionMarkets:MarketCreationRequest` - These are your pending market requests
   - `PredictionMarkets:Market` - These are approved/active markets

4. **Click on a contract** to see:
   - Full contract details
   - Market title and description
   - Current state
   - Transaction history

---

## Troubleshooting

### If you don't see contracts:
- **Check the party ID** - Make sure you're using the full party ID format: `{user-id}::{party-id}`
- **Check the timestamp** - Contracts appear shortly after creation
- **Try searching by package ID** - This shows all contracts from your package

### If the explorer is slow:
- The explorer may take a few seconds to index new contracts
- Try refreshing the page
- Wait a moment after creating contracts before searching

---

## Additional Resources

- **Package ID**: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`
- **Package Name**: `prediction-markets`
- **Your Party ID**: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`

---

## Quick Reference

| What to View | Search For | Direct Link |
|-------------|------------|-------------|
| All your contracts | Party ID | [Search by Party](https://devnet.ccexplorer.io/?q=ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292) |
| All package contracts | Package ID | [Search by Package](https://devnet.ccexplorer.io/?q=b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0) |
| Package info | Package name | [Search by Name](https://devnet.ccexplorer.io/?q=prediction-markets) |

---

**Note**: The block explorer is read-only and shows historical data. It's perfect for verifying contracts exist and viewing their state, but it doesn't allow you to interact with contracts (that's what the frontend app is for!).

