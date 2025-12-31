# API Reference

## Canton JSON API

The application uses the Canton JSON API for all ledger interactions.

Base URL: `https://participant.dev.canton.wolfedgelabs.com`

### Endpoints

#### Query Contracts

**Note**: Query endpoints do NOT exist in the JSON API per OpenAPI documentation.
Contract querying requires gRPC API or WebSocket connections.

For contract queries, use:
- gRPC Ledger API
- WebSocket connections
- Contract storage system (local tracking of created contracts)

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

## Example Queries

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

