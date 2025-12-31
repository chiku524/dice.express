# Why Are Query Endpoints Being Used?

## The Core Question

**Why are we trying to use query endpoints at all?** What functionality requires them?

## Where Query Endpoints Are Used

Looking at the codebase, query endpoints are being used in **3 main places**:

### 1. MarketsList.jsx (Line 45)
```javascript
const fetchedMarkets = await ledger.query(
  [`${PACKAGE_ID}:PredictionMarkets:Market`], 
  {}, 
  { forceRefresh: true }
)
```

**Purpose**: Display a list of all approved markets on the Markets page

**Why it's used**: Users expect to see a list of available markets to browse and trade

### 2. AdminDashboard.jsx (Line 42)
```javascript
const fetchedRequests = await ledger.query(
  [`${PACKAGE_ID}:PredictionMarkets:MarketCreationRequest`],
  { admin: wallet.party },
  { forceRefresh: true }
)
```

**Purpose**: Display pending market creation requests that need admin approval

**Why it's used**: Admins need to see what markets are waiting for approval

### 3. Portfolio.jsx (Line 47)
```javascript
const fetchedPositions = await ledger.query(
  [`${PACKAGE_ID}:PredictionMarkets:Position`],
  { owner: wallet.party }
)
```

**Purpose**: Display user's active trading positions

**Why it's used**: Users need to see their own positions and portfolio

## The Real Question: Are These Features Necessary?

### Option 1: These Features ARE Necessary (Standard App Design)

**If this is a standard prediction markets app**, then:
- ✅ Users **expect** to see a list of markets
- ✅ Admins **need** to see pending requests
- ✅ Users **want** to see their portfolio

**In this case**: Query endpoints are necessary for these standard features.

### Option 2: These Features Are NOT Necessary (Alternative Design)

**If we can design the app differently**, we might not need query endpoints:

#### Alternative Design 1: Contract ID-Based Navigation
- Users navigate by **contract ID** (entered manually or from links)
- No "list all markets" page - users go directly to specific markets
- Portfolio shows only contracts the user created (stored locally)

**Pros:**
- ✅ No query endpoints needed
- ✅ Simpler implementation
- ✅ Works with current JSON API limitations

**Cons:**
- ❌ Poor user experience (users can't browse markets)
- ❌ Can't discover new markets
- ❌ Limited functionality

#### Alternative Design 2: Event-Driven Architecture
- When a market is created, emit an event
- Store events locally or in a database
- Build lists from stored events, not live queries

**Pros:**
- ✅ No query endpoints needed
- ✅ Can build lists from events
- ✅ Works with current JSON API

**Cons:**
- ❌ Requires event storage infrastructure
- ❌ More complex architecture
- ❌ Still need to track events somehow

#### Alternative Design 3: Block Explorer Integration
- Use block explorer API (if available) to fetch contracts
- Or scrape block explorer pages
- Build lists from explorer data

**Pros:**
- ✅ No query endpoints needed
- ✅ Can see all contracts

**Cons:**
- ❌ Block explorer may not have API
- ❌ Scraping is fragile and unreliable
- ❌ Not a production solution

## What Makes Query Endpoints "Necessary"?

Query endpoints become necessary when you want:

1. **Discovery**: Users need to find contracts they don't know about
2. **Filtering**: Show only contracts matching certain criteria
3. **Real-time Lists**: Display up-to-date lists of contracts
4. **Standard UX**: Users expect to see lists (markets, positions, etc.)

## Current Situation

### What We're Trying to Do
- Show a list of all markets (Markets page)
- Show pending admin requests (Admin Dashboard)
- Show user's positions (Portfolio)

### Why We Need Query Endpoints
- We don't know all contract IDs in advance
- We need to filter contracts (e.g., "only active markets")
- We need to show contracts created by others, not just ourselves

### What We Can Do Without Query Endpoints
- ✅ Show contracts we created (stored locally)
- ✅ Navigate to specific contracts by ID
- ✅ Create new contracts
- ✅ View contracts on block explorer

### What We CAN'T Do Without Query Endpoints
- ❌ Browse all markets
- ❌ See markets created by others
- ❌ Filter markets by status/criteria
- ❌ Show real-time lists of contracts
- ❌ Admin dashboard showing pending requests

## The Answer

**Query endpoints are necessary because:**

1. **Standard App Features**: The app has pages (Markets, Admin, Portfolio) that are designed to show lists of contracts
2. **User Expectations**: Users expect to browse markets, see their portfolio, etc.
3. **Discovery**: Users need to find contracts they didn't create
4. **Filtering**: We need to filter contracts (active markets, pending requests, user's positions)

**However**, if we redesign the app to:
- Only show contracts the user created (stored locally)
- Require contract IDs for navigation
- Remove the "browse markets" feature

Then query endpoints would **not** be necessary.

## Recommendation

**Option A: Keep Current Design (Requires Query Endpoints)**
- Implement gRPC or WebSocket client for queries
- Keep Markets, Admin, Portfolio pages as-is
- Full-featured app with standard UX

**Option B: Simplify Design (No Query Endpoints Needed)**
- Remove Markets list page (or make it show only locally stored contracts)
- Remove Admin Dashboard (or make it work with locally stored contracts)
- Simplify Portfolio to show only locally stored positions
- Users navigate by contract ID or links

**Option C: Hybrid Approach**
- Keep Markets/Admin/Portfolio pages but show only locally stored contracts
- Add "Enter Contract ID" functionality for accessing other contracts
- Accept that users can't browse all markets (only ones they know about)

## Conclusion

Query endpoints are being used because the app was designed with standard features (market listings, admin dashboard, portfolio) that require querying contracts. 

**They're necessary IF:**
- You want users to browse all markets
- You want admins to see pending requests
- You want users to see their full portfolio

**They're NOT necessary IF:**
- You're okay with contract ID-based navigation
- You only show contracts the user created
- You remove the "browse" features

The choice depends on what features you want the app to have.
