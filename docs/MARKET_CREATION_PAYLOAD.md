# MarketCreationRequest Contract Payload

## Complete Request Payload

### Full JSON API Request
```json
{
  "actAs": ["ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292"],
  "commandId": "test-marketcreationrequest-1767095310332",
  "applicationId": "prediction-markets",
  "commands": [{
    "CreateCommand": {
      "templateId": "b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:PredictionMarkets:MarketCreationRequest",
      "createArguments": {
        "creator": "ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292",
        "admin": "ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292",
        "marketId": "market-1767095310331",
        "title": "Test Market: Will Bitcoin reach $100k?",
        "description": "A test market to verify contract creation",
        "marketType": "Binary",
        "outcomes": [],
        "settlementTrigger": {
          "tag": "TimeBased",
          "value": "2025-12-31T11:48:30.331Z"
        },
        "resolutionCriteria": "Based on CoinGecko price at settlement time",
        "depositAmount": "100.0",
        "depositCid": null,
        "configCid": null,
        "creatorBalance": null,
        "adminBalance": null
      }
    }
  }]
}
```

## Field Descriptions

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `creator` | `Party` | Party creating the market | `"ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292"` |
| `admin` | `Party` | Admin party that will approve the market | `"ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292"` |
| `marketId` | `Text` | Unique identifier for the market | `"market-1767095310331"` |
| `title` | `Text` | Market title/question | `"Test Market: Will Bitcoin reach $100k?"` |
| `description` | `Text` | Market description | `"A test market to verify contract creation"` |
| `marketType` | `MarketType` | Type of market (enum) | `"Binary"` or `"MultiOutcome"` |
| `outcomes` | `[Text]` | List of outcomes (for MultiOutcome markets) | `[]` for Binary, `["Yes", "No"]` for MultiOutcome |
| `settlementTrigger` | `SettlementTrigger` | When/how market settles | See SettlementTrigger section |
| `resolutionCriteria` | `Text` | How market resolves | `"Based on CoinGecko price at settlement time"` |
| `depositAmount` | `Decimal` | Deposit amount required | `"100.0"` |

### Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `depositCid` | `Optional (ContractId TokenBalance)` | Contract ID of deposit token balance | `null` |
| `configCid` | `Optional (ContractId MarketConfig)` | Contract ID of market config | `null` |
| `creatorBalance` | `Optional (ContractId TokenBalance)` | Creator's token balance contract ID | `null` |
| `adminBalance` | `Optional (ContractId TokenBalance)` | Admin's token balance contract ID | `null` |

## SettlementTrigger Format

The `settlementTrigger` field uses a tagged union format:

### TimeBased
```json
{
  "tag": "TimeBased",
  "value": "2025-12-31T11:48:30.331Z"
}
```
- `value`: ISO 8601 timestamp string

### EventBased
```json
{
  "tag": "EventBased",
  "value": "Bitcoin reaches $100k"
}
```
- `value`: Text description of the event

### Manual
```json
{
  "tag": "Manual"
}
```
- No `value` field needed

## MarketType Values

### Binary Market
```json
"marketType": "Binary",
"outcomes": []
```

### MultiOutcome Market
```json
"marketType": "MultiOutcome",
"outcomes": ["Yes", "No", "Maybe"]
```

## Example Payloads

### Minimal Binary Market
```json
{
  "creator": "PARTY_ID",
  "admin": "PARTY_ID",
  "marketId": "market-123",
  "title": "Will it rain tomorrow?",
  "description": "Simple binary market",
  "marketType": "Binary",
  "outcomes": [],
  "settlementTrigger": {
    "tag": "TimeBased",
    "value": "2025-12-31T23:59:59Z"
  },
  "resolutionCriteria": "Based on weather service data",
  "depositAmount": "100.0",
  "depositCid": null,
  "configCid": null,
  "creatorBalance": null,
  "adminBalance": null
}
```

### MultiOutcome Market
```json
{
  "creator": "PARTY_ID",
  "admin": "PARTY_ID",
  "marketId": "market-456",
  "title": "What will be the Bitcoin price at year end?",
  "description": "Multi-outcome price prediction",
  "marketType": "MultiOutcome",
  "outcomes": ["< $50k", "$50k-$100k", "> $100k"],
  "settlementTrigger": {
    "tag": "TimeBased",
    "value": "2025-12-31T23:59:59Z"
  },
  "resolutionCriteria": "Based on CoinGecko closing price",
  "depositAmount": "200.0",
  "depositCid": null,
  "configCid": null,
  "creatorBalance": null,
  "adminBalance": null
}
```

### With Optional Fields
```json
{
  "creator": "PARTY_ID",
  "admin": "PARTY_ID",
  "marketId": "market-789",
  "title": "Election Outcome",
  "description": "Presidential election prediction",
  "marketType": "Binary",
  "outcomes": [],
  "settlementTrigger": {
    "tag": "EventBased",
    "value": "Election results announced"
  },
  "resolutionCriteria": "Official election results",
  "depositAmount": "500.0",
  "depositCid": "00abc123...",
  "configCid": "00def456...",
  "creatorBalance": "00ghi789...",
  "adminBalance": "00jkl012..."
}
```

## DAML Template Definition

```daml
template MarketCreationRequest
  with
    creator : Party
    admin : Party
    marketId : MarketId
    title : Text
    description : Text
    marketType : MarketType
    outcomes : [Text]
    settlementTrigger : SettlementTrigger
    resolutionCriteria : Text
    depositAmount : Decimal
    depositCid : Optional (ContractId TokenBalance)
    configCid : Optional (ContractId MarketConfig)
    creatorBalance : Optional (ContractId TokenBalance)
    adminBalance : Optional (ContractId TokenBalance)
  where
    signatory creator, admin
```

## Notes

1. **MarketType Enum**: Use plain string `"Binary"` or `"MultiOutcome"` (not object format)
2. **SettlementTrigger**: Use tagged union format with `tag` and `value` fields
3. **Optional Fields**: Can be `null` - will be set during approval if needed
4. **Party IDs**: Use full party ID format: `"participant-id::party-id"`
5. **Decimal Values**: Use string format for Decimal fields: `"100.0"`

## Current Implementation

The payload is generated in `frontend/src/components/ContractTester.jsx`:

```javascript
const createMarketCreationRequest = () => {
  createContract(
    'MarketCreationRequest',
    getTemplateId('PredictionMarkets', 'MarketCreationRequest'),
    {
      creator: PARTY_ID,
      admin: PARTY_ID,
      marketId: `market-${Date.now()}`,
      title: 'Test Market: Will Bitcoin reach $100k?',
      description: 'A test market to verify contract creation',
      marketType: 'Binary',
      outcomes: [],
      settlementTrigger: {
        tag: 'TimeBased',
        value: new Date(Date.now() + 86400000).toISOString()
      },
      resolutionCriteria: 'Based on CoinGecko price at settlement time',
      depositAmount: '100.0',
      depositCid: null,
      configCid: null,
      creatorBalance: null,
      adminBalance: null
    }
  )
}
```

