# Canton Blockchain Integration Guide

## Overview

This document outlines the current and future state of Canton blockchain integration for the prediction markets application. It serves as a reference for when Canton offers full on-chain capabilities.

## Current State (Hybrid Approach)

### What Works On-Chain

✅ **Contract Creation**
- Market creation requests are submitted to Canton blockchain
- Contracts are created using Canton JSON API
- Transaction IDs (updateIds) are tracked

✅ **Choice Exercising**
- Admin approval/rejection of markets
- Market resolution operations
- Position creation (when fully implemented)

### What Uses Database Fallback

⚠️ **Contract Querying**
- Canton JSON API does not provide general contract query endpoints
- Application uses Supabase database as primary source
- Blockchain is source of truth for contract state, database for queries

⚠️ **Position Tracking**
- Positions are tracked in database
- Volume calculations use database data
- Blockchain will be primary source when query capabilities are available

## Required Canton Features for Full On-Chain Support

### 1. Contract Query Endpoints

**Current Limitation:**
The Canton JSON API does not provide endpoints to:
- Query all active contracts by template ID
- Search contracts by payload fields
- Get contracts visible to a party without contract ID

**Required Feature:**
```http
POST /v2/contracts/query
Content-Type: application/json

{
  "templateIds": ["Package:Module:Template"],
  "filters": {
    "party": "Party::...",
    "payload": {
      "field": "value"
    }
  },
  "limit": 100,
  "offset": 0
}
```

**When Available:**
- Update `CantonProvider.queryContracts()` to use new endpoint
- Remove database fallback for contract queries
- Enable real-time market listing from blockchain

### 2. Contract Retrieval by ID

**Current Limitation:**
Cannot retrieve a contract by its contract ID via JSON API.

**Required Feature:**
```http
GET /v2/contracts/{contractId}
Authorization: Bearer {token}
```

**When Available:**
- Implement `CantonProvider.getContract(contractId)`
- Enable direct contract lookup without database
- Improve market detail page loading

### 3. Real-Time Contract Events

**Current Limitation:**
No WebSocket or Server-Sent Events (SSE) support for contract updates.

**Required Feature:**
```javascript
// WebSocket connection
ws://ledger.example.com/v2/events

// Subscribe message
{
  "action": "subscribe",
  "templateIds": ["Package:Module:Template"],
  "party": "Party::..."
}

// Event message
{
  "type": "contractCreated",
  "contractId": "...",
  "templateId": "...",
  "payload": {...},
  "timestamp": "..."
}
```

**When Available:**
- Implement real-time market updates
- Update positions in real-time
- Remove polling mechanisms
- Better user experience with instant updates

### 4. Contract Archival Support

**Current Limitation:**
Cannot archive contracts via JSON API (or not clearly documented).

**Required Feature:**
```http
POST /v2/contracts/{contractId}/archive
Authorization: Bearer {token}

{
  "party": "Party::..."
}
```

**When Available:**
- Enable proper contract lifecycle management
- Support contract cleanup operations

### 5. Transaction History

**Current Limitation:**
Cannot query transaction history for an account.

**Required Feature:**
```http
GET /v2/transactions?party={partyId}&limit=100&offset=0
Authorization: Bearer {token}
```

**When Available:**
- Implement complete transaction history
- Enable activity logs directly from blockchain
- Support audit trails

## Migration Path

### Phase 1: Query Endpoints (Priority 1)

**Timeline:** When Canton JSON API adds query endpoints

**Changes Required:**
1. Update `CantonProvider.queryContracts()` implementation
2. Modify `MarketsList` component to use blockchain queries
3. Keep database as cache/fallback initially
4. Gradually migrate to blockchain-first approach

**Code Changes:**
```javascript
// frontend/src/services/blockchain/CantonProvider.js
async queryContracts(templateIds, filters, options) {
  const response = await this.client.post('/v2/contracts/query', {
    templateIds,
    filters,
    limit: options.limit || 100,
    offset: options.offset || 0
  })
  return response.data.contracts
}
```

### Phase 2: Contract Retrieval (Priority 2)

**Timeline:** When contract retrieval endpoint is available

**Changes Required:**
1. Implement `CantonProvider.getContract()`
2. Update `MarketDetail` component
3. Remove database dependency for contract retrieval

### Phase 3: Real-Time Events (Priority 3)

**Timeline:** When WebSocket/SSE support is available

**Changes Required:**
1. Add WebSocket client to `CantonProvider`
2. Implement event subscription methods
3. Update components to use events instead of polling
4. Remove polling intervals

**Code Structure:**
```javascript
class CantonProvider extends BlockchainProvider {
  constructor(config) {
    super(config)
    this.wsClient = null
  }

  async connect() {
    // ... existing connection logic
    
    // Connect WebSocket
    this.wsClient = new WebSocket(this.config.wsUrl)
    this.wsClient.on('message', this.handleEvent.bind(this))
  }

  subscribeToContracts(templateIds, callback) {
    this.wsClient.send({
      action: 'subscribe',
      templateIds,
      party: this.getAccount()
    })
    this.eventCallbacks.push(callback)
  }

  handleEvent(event) {
    this.eventCallbacks.forEach(cb => cb(event))
  }
}
```

### Phase 4: Complete Migration (Final)

**Timeline:** When all features are available

**Changes Required:**
1. Make blockchain primary source for all operations
2. Use database only for indexing and performance
3. Implement proper caching strategies
4. Update all components to use blockchain-first approach
5. Remove database fallbacks (keep as cache)

## Configuration Updates

When full on-chain support is available, update configuration:

```env
# Canton Full Configuration
VITE_CANTON_LEDGER_URL=https://participant.dev.canton.wolfedgelabs.com/json-api
VITE_CANTON_WS_URL=wss://participant.dev.canton.wolfedgelabs.com/v2/events
VITE_CANTON_GRPC_URL=participant.dev.canton.wolfedgelabs.com:5011
VITE_CANTON_PACKAGE_ID=b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0

# Feature Flags
VITE_CANTON_QUERY_ENABLED=true
VITE_CANTON_EVENTS_ENABLED=true
VITE_CANTON_FULL_ON_CHAIN=true
```

## Testing Strategy

When migrating to full on-chain:

1. **Unit Tests**: Test provider methods with mock responses
2. **Integration Tests**: Test with Canton testnet
3. **Migration Tests**: Verify database fallback works during transition
4. **Performance Tests**: Measure query performance vs database
5. **Load Tests**: Ensure WebSocket connections handle high load

## Rollback Plan

If issues arise during migration:

1. Feature flags allow quick rollback to database-first approach
2. Database remains as backup during transition
3. Gradual rollout: enable for specific features first
4. Monitor error rates and performance metrics

## Resources

- [Canton Documentation](https://www.daml.com/canton)
- [Canton JSON API Reference](./API.md)
- [Blockchain Integration Architecture](./BLOCKCHAIN_INTEGRATION.md)
- [Architecture Overview](./ARCHITECTURE.md)

## Notes

- This document will be updated as Canton adds new features
- Check Canton release notes for new capabilities
- Monitor Canton community forums for feature announcements
- Test new features on Canton testnet before production deployment
