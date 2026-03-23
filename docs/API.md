# API Reference

## Cloudflare Pages API (production)

The live product serves **`/api/*`** from **Cloudflare Pages Functions** with **D1** as the system of record. Base URL is your deployment (e.g. `https://dice.express` or `https://dice-express.pages.dev`). No separate backend host is required when D1 and bindings are configured.

### Ops-only routes (optional secret)

If **`PRIVILEGED_API_SECRET`** and/or **`AUTO_MARKETS_CRON_SECRET`** is set in the Pages environment, the following **`POST`** handlers require a matching secret (otherwise they return **401**):

- **`/api/add-credits`**, **`/api/update-user-balance`**, **`/api/store-contract`**, **`/api/create-position`**, **`/api/resolve-markets`**

Send **`X-Privileged-Secret`** (for `PRIVILEGED_API_SECRET`) and/or **`X-Cron-Secret`** (for `AUTO_MARKETS_CRON_SECRET`). Body fields **`privilegedSecret`** / **`cronSecret`** are accepted as alternates. If **neither** env var is set, these routes stay **open** — no secret headers required — which is fine for many deployments (local dev and production until you opt in to locking them down). The **auto-markets cron Worker** then does **not** need matching secrets on the Worker for **`POST /api/resolve-markets`** to succeed.

When you **do** set **`PRIVILEGED_API_SECRET`** on Pages, set the **same** value on the Worker so scheduled **`resolve-markets`** calls include **`X-Privileged-Secret`**.

**`update-market-status`** and **`update-contract-status`** are not gated by this helper; restrict or authenticate those callers separately if you use them from scripts or tools.

### Core endpoints (summary)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/health` | Liveness. |
| `GET` | `/api/markets` | Lists virtual markets. Query: `source`, `status`. **`sort=activity`** or **`sort=p2p`** sorts by open P2P limit-order count (skips KV cache for fresh counts). Each market includes **`openOrderCount`**. |
| `POST` | `/api/markets` | Creates a market (**`source: 'user'`** is rejected). Automated creation uses **`/api/auto-markets`**. |
| `GET` | `/api/pools?marketId=…` | Liquidity pool state (AMM). |
| `POST` | `/api/trade` | AMM trade (may be disabled when pools have zero liquidity). |
| `GET` / `POST` | `/api/orders` | P2P limit orders: list, place, cancel. |
| `POST` | `/api/create-position` | P2P / structured positions. **Ops secret** if configured (see above). |
| `GET` / `POST` | `/api/auto-markets` | **`action=events`**, **`probe`**, **`seed`**, **`seed_all`**. Seeding may require **`X-Cron-Secret`** if **`AUTO_MARKETS_CRON_SECRET`** is set on Pages. See **`PREDICTION_MARKETS.md`**. |
| `POST` | `/api/prediction-maintenance` | Embedding / Vectorize ops: **`backfill_embeddings`**, **`prune_settled_embeddings`**, **`delete_embeddings_by_ids`**. Auth: **`X-Maintenance-Secret`** (**`PREDICTION_MAINTENANCE_SECRET`**) or shared cron secret. See **`PREDICTION_MARKETS.md`** (Maintenance). |
| `POST` | `/api/resolve-markets` | Resolves due markets from oracle APIs; settles P2P winners (2% fee). **Ops secret** if configured. |
| `POST` | `/api/update-market-status` | Manual status / settlement updates. |
| `POST` | `/api/deposit-crypto` | Credits Pips after on-chain verification (secret). |
| `POST` | `/api/process-withdrawals` | Sends pending withdrawals (secret). |

### Implementation pointers

- Router: `functions/api/[[path]].js`
- Storage: `functions/lib/cf-storage.mjs` (D1, KV, R2)
- Auto-markets data: `functions/lib/data-sources.mjs` (**`AUTO_MARKET_SOURCES`**)
- Dedupe: `functions/lib/market-dedupe.mjs` (lexical + semantic); **`functions/lib/market-embeddings.mjs`** (Workers AI + Vectorize)
- Resolution: `functions/lib/resolve-markets.mjs`

---

## Historical: Canton / DAML ledger API (reference)

The sections below describe a **ledger JSON API** (e.g. Canton) and DAML templates used in an earlier architecture. **Production dice.express does not expose these paths**; markets and balances live in **D1**. Kept for reference only.

The application may still use a ledger JSON API for command submission on supported networks. Other networks can be added via the provider system.

Base URL (example): `https://participant.dev.canton.wolfedgelabs.com`

### Query Endpoints (Canton JSON API)

**Query endpoints do NOT exist in the Canton JSON API** per the official OpenAPI documentation. This is by design:

- The JSON API is **command submission only** (security, performance).
- For contract data we use a **database-first approach**: contracts are stored in Supabase; markets, history, admin, and portfolio query the database.
- Alternatives if you need direct ledger query: gRPC Ledger API, WebSocket, or request enablement from Canton admin.

**Current status**: ✅ Database-first (Supabase); ✅ Command submission works; ❌ JSON API query endpoints unavailable (not part of design).

### Endpoints

#### Create Contract

```http
POST /v2/commands/submit-and-wait
Content-Type: application/json

{
  "commands": {
    "party": "User1",
    "applicationId": "prediction-markets",
    "commandId": "create-market-123",
    "list": [{
      "templateId": "PredictionMarkets:MarketCreationRequest",
      "payload": {
        "creator": "User1",
        "admin": "Admin",
        "marketId": "market-123",
        "title": "Will Bitcoin reach $100k?",
        "description": "Market description...",
        "marketType": { "tag": "Binary" },
        "outcomes": [],
        "settlementTrigger": { "tag": "TimeBased", "value": "2025-12-31T00:00:00Z" },
        "resolutionCriteria": "Based on CoinGecko price at settlement time",
        "depositAmount": 100.0,
        "depositCid": "<holding_contract_id>",
        "configCid": "<config_contract_id>",
        "creatorAccount": null,
        "adminAccount": null
      }
    }]
  }
}
```

#### Exercise Choice

```http
POST /v2/commands/submit-and-wait
Content-Type: application/json

{
  "commands": {
    "party": "Admin",
    "applicationId": "prediction-markets",
    "commandId": "approve-market-123",
    "list": [{
      "templateId": "PredictionMarkets:MarketCreationRequest",
      "contractId": "<request_contract_id>",
      "choice": "ApproveMarket",
      "argument": {}
    }]
  }
}
```

## DAML Contract Interfaces

### MarketConfig

**Template ID**: `PredictionMarkets:MarketConfig`

**Fields**:
- `admin: Party` - Admin party
- `marketCreationDeposit: Decimal` - Required deposit (100.0 CC)
- `marketCreationFee: Decimal` - Fee for market creation
- `positionChangeFee: Decimal` - Fee for position changes
- `partialCloseFee: Decimal` - Fee for partial closes
- `settlementFee: Decimal` - Fee for settlement
- `oracleParty: Party` - Oracle party
- `stablecoinCid: ContractId Token` - Stablecoin token contract

**Choices**:
- `UpdateFees` - Update fee rates (admin only)

### MarketCreationRequest

**Template ID**: `PredictionMarkets:MarketCreationRequest`

**Fields**:
- `creator: Party` - Market creator
- `admin: Party` - Admin party
- `marketId: MarketId` - Unique market identifier
- `title: Text` - Market title
- `description: Text` - Market description
- `marketType: MarketType` - Binary or MultiOutcome
- `outcomes: [Text]` - Outcomes for multi-outcome markets
- `settlementTrigger: SettlementTrigger` - Settlement trigger
- `resolutionCriteria: Text` - Resolution criteria description
- `depositAmount: Decimal` - Deposit amount (100.0 CC)
- `depositCid: ContractId Holding` - Deposit holding contract
- `configCid: ContractId MarketConfig` - Market config reference

**Choices**:
- `ApproveMarket` - Approve market creation (admin only)
- `RejectMarket` - Reject market creation (admin only)

### Market

**Template ID**: `PredictionMarkets:Market`

**Fields**:
- `marketId: MarketId` - Market identifier
- `creator: Party` - Market creator
- `admin: Party` - Admin party
- `title: Text` - Market title
- `description: Text` - Market description
- `marketType: MarketType` - Market type
- `outcomes: [Text]` - Available outcomes
- `settlementTrigger: SettlementTrigger` - Settlement trigger
- `resolutionCriteria: Text` - Resolution criteria
- `status: MarketStatus` - Current status
- `totalVolume: Decimal` - Total trading volume
- `yesVolume: Decimal` - Yes volume (binary markets)
- `noVolume: Decimal` - No volume (binary markets)
- `outcomeVolumes: Map Text Decimal` - Per-outcome volumes
- `positions: Map PositionId (ContractId Position)` - Position references
- `resolutionData: Optional OracleData` - Oracle resolution data
- `resolvedOutcome: Optional Text` - Resolved outcome
- `settlementStep: Int` - Current settlement step
- `createdAt: Time` - Creation timestamp
- `configCid: ContractId MarketConfig` - Config reference

**Choices**:
- `GetMarketState` - View market state (non-consuming)
- `CreatePosition` - Create a new position
- `UpdatePosition` - Update existing position
- `PartialClosePosition` - Partially close position
- `StartResolution` - Start resolution process (admin only)
- `ResolveOutcome` - Resolve outcome (admin only)
- `ExecuteSettlement` - Execute settlement (admin only)
- `AdminOverride` - Admin override for disputes (admin only)

### Position

**Template ID**: `PredictionMarkets:Position`

**Fields**:
- `positionId: PositionId` - Position identifier
- `marketId: MarketId` - Market identifier
- `owner: Party` - Position owner
- `positionType: PositionType` - Position type (Yes/No/Outcome)
- `amount: Decimal` - Position amount
- `price: Decimal` - Price per share
- `createdAt: Time` - Creation timestamp

**Choices**:
- `GetPosition` - View position (non-consuming, owner only)
- `UpdatePositionAmount` - Update position amount/price (owner only)
- `Archive` - Archive position (owner only)

### OracleDataFeed

**Template ID**: `PredictionMarkets:OracleDataFeed`

**Fields**:
- `oracleParty: Party` - Oracle party
- `marketId: MarketId` - Market identifier
- `dataSource: Text` - Data source identifier
- `data: OracleData` - Oracle data (JSON string)
- `timestamp: Time` - Data timestamp
- `signature: Optional Text` - Optional signature

**Choices**:
- `UpdateData` - Update oracle data (oracle party only)

## Data Types

### MarketType
```daml
data MarketType = Binary | MultiOutcome
```

### MarketStatus
```daml
data MarketStatus = PendingApproval | Active | Resolving | Settled
```

### PositionType
```daml
data PositionType = Yes | No | Outcome Text
```

### SettlementTrigger
```daml
data SettlementTrigger = TimeBased Time | EventBased Text | Manual
```

## Example Queries (ledger; reference only)

### Get All Active Markets

```javascript
const response = await fetch('https://participant.dev.canton.wolfedgelabs.com/v1/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateIds: ['PredictionMarkets:Market'],
    query: { status: 'Active' }
  })
})
```

### Get User Positions

```javascript
const response = await fetch('https://participant.dev.canton.wolfedgelabs.com/v1/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateIds: ['PredictionMarkets:Position'],
    query: { owner: 'User1' }
  })
})
```

### Create Position

```javascript
const response = await fetch('https://participant.dev.canton.wolfedgelabs.com/v1/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    commands: {
      party: 'User1',
      applicationId: 'prediction-markets',
      commandId: `create-position-${Date.now()}`,
      list: [{
        templateId: 'PredictionMarkets:Market',
        contractId: '<market_contract_id>',
        choice: 'CreatePosition',
        argument: {
          positionId: `pos-${Date.now()}`,
          owner: 'User1',
          positionType: { tag: 'Yes' },
          amount: 100.0,
          price: 0.5
        }
      }]
    }
  })
})
```

## WebSocket Subscriptions

For real-time updates, subscribe to contract events:

```javascript
const ws = new WebSocket('wss://participant.dev.canton.wolfedgelabs.com/v1/stream/query')

ws.send(JSON.stringify({
  templateIds: ['PredictionMarkets:Market'],
  query: {}
}))
```
