# Finding Contract Details on Canton Devnet Explorer

## Problem
You can see transactions but can't find the contract details (like market titles, descriptions, etc.)

## Solution: Navigate from Transactions to Contracts

### Step-by-Step Guide

#### Step 1: Find Your Transactions
1. Go to [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. Search for your party ID: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
3. You should see a list of transactions

#### Step 2: Click on a Transaction
1. Click on any transaction that shows "Create" or "SubmitCommand"
2. This will open the transaction details page

#### Step 3: Find the Contract ID in Transaction Details
In the transaction details, look for:
- **"Created Contracts"** section
- **"Contract ID"** field
- The contract ID will look like: `00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00#12345`

#### Step 4: Click on the Contract ID
1. The contract ID should be a clickable link
2. Click on it to view the contract details
3. This will show you:
   - Contract payload (all the data including title, description, etc.)
   - Contract state
   - Template information

---

## Alternative: Direct Contract Search

### Method 1: Search by Template Type

1. Go to [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. Look for a search or filter option
3. Try searching for:
   - `MarketCreationRequest`
   - `Market`
   - `PredictionMarkets:MarketCreationRequest`
   - `PredictionMarkets:Market`

### Method 2: Browse Contracts Tab

1. Go to [https://devnet.ccexplorer.io/](https://devnet.ccexplorer.io/)
2. Look for a "Contracts" tab or section in the navigation
3. Filter by:
   - Your party ID
   - Template type
   - Package ID

---

## What to Look For in Contract Details

Once you find a contract and click on it, you should see:

### For MarketCreationRequest Contracts:
- **title**: The market title (e.g., "Snowfall in Miami - 2025")
- **description**: Market description
- **marketType**: "Binary" or "MultiOutcome"
- **marketId**: Unique market identifier
- **creator**: Your party ID
- **admin**: Admin party ID
- **depositAmount**: "100.0"
- **settlementTrigger**: Time-based or event-based trigger
- **resolutionCriteria**: How the market resolves

### For Market Contracts:
- **title**: Market title
- **description**: Market description
- **status**: "Active", "Resolving", or "Settled"
- **totalVolume**: Total trading volume
- **yesVolume**: Yes votes volume
- **noVolume**: No votes volume
- **positions**: All positions in the market

---

## Quick Navigation Tips

### If You See Transactions But Not Contracts:

1. **Check the transaction type**:
   - Look for transactions labeled "Create" or "CreateCommand"
   - These should have contract IDs in the output

2. **Look for "Created" or "Output" section**:
   - Transactions that create contracts will show the created contract IDs
   - Click on those contract IDs

3. **Check the transaction output/result**:
   - Expand the transaction details
   - Look for a "result" or "output" section
   - Find contract IDs in the "created" array

---

## Using the Explorer UI

### Common Explorer Sections:

1. **Transactions Tab**
   - Shows all transactions
   - Click a transaction → See details → Find contract IDs

2. **Contracts Tab** (if available)
   - Direct list of all contracts
   - Filter by party, template, or package

3. **Parties Tab**
   - Shows party information
   - Click your party → See all contracts for that party

4. **Packages Tab**
   - Shows deployed packages
   - Click your package → See all contracts from that package

---

## Getting Contract IDs from Your App

If you can't find contracts on the explorer, you can get contract IDs from your application:

### Method 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Create a market
4. Look for the response that contains `contractId` or `contract_id`
5. Copy that ID and search for it on the explorer

### Method 2: Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Create a market
4. Find the API response
5. Look for `contractId` in the response JSON
6. Copy and search on explorer

### Method 3: Check Success Messages
If your app shows success messages with contract IDs, copy those and search on the explorer.

---

## Direct Search URLs

Try these direct search URLs (replace `CONTRACT_ID` with actual contract ID):

```
https://devnet.ccexplorer.io/contracts/CONTRACT_ID
https://devnet.ccexplorer.io/?q=CONTRACT_ID
```

---

## If You Still Can't Find Contracts

1. **Verify the contract was actually created**:
   - Check the transaction status (should be "Success" or "Committed")
   - Look for error messages in the transaction

2. **Check the explorer indexing**:
   - New contracts may take a few seconds to appear
   - Try refreshing the page
   - Wait 10-30 seconds after creating a contract

3. **Try different search methods**:
   - Search by transaction ID
   - Search by timestamp
   - Browse recent transactions

4. **Check contract visibility**:
   - Some contracts may only be visible to certain parties
   - Make sure you're searching with the correct party ID

---

## Example: Finding a MarketCreationRequest

1. **Go to**: https://devnet.ccexplorer.io/
2. **Search for**: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292`
3. **Click on a transaction** that shows "Create" or has your party as submitter
4. **In transaction details**, look for:
   - "Created Contracts" section
   - Or "Output" → "created" array
   - Find contract ID like: `00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00#12345`
5. **Click the contract ID** (it should be a link)
6. **View contract details** - you'll see the payload with title, description, etc.

---

## Contract ID Format

Contract IDs in Canton look like:
```
00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00#12345
```

They consist of:
- 32 bytes of hex (the contract instance ID)
- A `#` separator
- A number (the transaction sequence number)

---

## Need More Help?

If you're still having trouble:
1. Share a screenshot of what you see on the explorer
2. Share the transaction ID you're looking at
3. Check if the explorer has a "Contracts" or "Active Contracts" section in the main navigation

