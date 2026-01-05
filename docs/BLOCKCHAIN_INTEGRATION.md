# Blockchain Integration Architecture

## Overview

This application uses a **dynamic blockchain integration system** that allows seamless support for multiple blockchain networks while maintaining a consistent interface. The architecture is designed to be:

- **Network-agnostic**: Applications work with any supported blockchain
- **Extensible**: Easy to add new blockchain networks
- **Future-proof**: Ready for full on-chain capabilities when available

## Architecture

### Core Components

1. **BlockchainProvider** (`frontend/src/services/blockchain/BlockchainProvider.js`)
   - Abstract base class defining the interface for blockchain operations
   - All blockchain networks must implement this interface
   - Provides consistent API across different networks

2. **BlockchainRegistry** (`frontend/src/services/blockchain/BlockchainRegistry.js`)
   - Central registry for blockchain network providers
   - Allows dynamic registration and selection of networks
   - Manages default network configuration

3. **Network-Specific Providers**
   - Each blockchain network has its own provider implementation
   - Currently: `CantonProvider` (Canton blockchain)
   - Future: `EthereumProvider`, `PolygonProvider`, etc.

### Provider Interface

All blockchain providers must implement these methods:

```javascript
class BlockchainProvider {
  async connect()                    // Initialize connection
  async disconnect()                 // Close connection
  async getAccount()                 // Get current account/party
  async createContract(...)          // Create a contract
  async exerciseChoice(...)          // Exercise a contract choice
  async queryContracts(...)          // Query contracts
  async getContract(...)             // Get contract by ID
  getSupportedFeatures()             // List supported features
}
```

## Current Implementation: Canton

### Canton Provider (`CantonProvider`)

The Canton provider currently implements the hybrid approach:
- **On-chain operations**: Contract creation and choice exercising
- **Database-backed**: Contract queries and position tracking
- **Limitations**: Due to Canton JSON API limitations, some features are not yet fully on-chain

### Supported Features

Currently supported:
- ✅ Contract creation
- ✅ Choice exercising
- ⚠️ Contract querying (limited - uses database fallback)
- ❌ Direct contract retrieval (not yet supported)
- ❌ Real-time events (not yet supported)

## Future: Full On-Chain Canton Support

When Canton provides the necessary capabilities, the `CantonProvider` will be updated to support:

### 1. Direct Contract Querying

**Current State:**
```javascript
async queryContracts(templateIds, filters, options) {
  // Returns empty array - falls back to database
  return []
}
```

**Future Implementation:**
```javascript
async queryContracts(templateIds, filters, options) {
  // Use gRPC or WebSocket API for direct blockchain queries
  const contracts = await this.grpcClient.queryContracts({
    templateIds,
    filters,
    party: await this.getAccount()
  })
  return contracts
}
```

### 2. Real-Time Contract Events

**Future Implementation:**
```javascript
subscribeToContracts(templateIds, callback) {
  // Subscribe to contract events via WebSocket
  this.wsClient.subscribe({
    templateIds,
    callback: (event) => {
      callback(event)
    }
  })
}
```

### 3. Complete On-Chain Operations

When full on-chain support is available:
- All market operations will be on-chain
- All position tracking will be on-chain
- Database will be used only for indexing and performance
- Real-time updates via WebSocket/gRPC

## Adding a New Blockchain Network

To add support for a new blockchain network:

### Step 1: Create Provider Class

```javascript
// frontend/src/services/blockchain/EthereumProvider.js
import { BlockchainProvider } from './BlockchainProvider'

export class EthereumProvider extends BlockchainProvider {
  constructor(config = {}) {
    super({
      networkId: 'ethereum',
      name: 'Ethereum',
      ...config
    })
    this.web3 = null
    this.contracts = {}
  }

  async connect() {
    // Initialize Web3 connection
    this.web3 = new Web3(this.config.rpcUrl)
    this.isConnected = true
  }

  async createContract(templateId, payload, account) {
    // Implement contract creation for Ethereum
    const contract = new this.web3.eth.Contract(ABI, templateId)
    const result = await contract.methods.create(payload).send({ from: account })
    return {
      contractId: result.contractAddress,
      transactionHash: result.transactionHash
    }
  }

  // ... implement other required methods
}
```

### Step 2: Register Provider

```javascript
// In your initialization code
import { blockchainRegistry } from './services/blockchain/BlockchainRegistry'
import { EthereumProvider } from './services/blockchain/EthereumProvider'

blockchainRegistry.registerProvider('ethereum', EthereumProvider, {
  rpcUrl: process.env.VITE_ETHEREUM_RPC_URL,
  chainId: 1
})
```

### Step 3: Use Provider

```javascript
import { blockchainRegistry } from './services/blockchain/BlockchainRegistry'

const provider = blockchainRegistry.getProvider('ethereum')
await provider.connect()
const account = await provider.getAccount()
const result = await provider.createContract(templateId, payload, account)
```

## Migration Strategy: Database-First to Full On-Chain

### Phase 1: Current (Hybrid)
- Contract creation: On-chain
- Choice exercising: On-chain
- Contract queries: Database
- Position tracking: Database

### Phase 2: Enhanced Hybrid
- Contract creation: On-chain
- Choice exercising: On-chain
- Contract queries: On-chain (when available) + Database cache
- Position tracking: On-chain primary, Database index

### Phase 3: Full On-Chain
- All operations: On-chain
- Database: Indexing and performance only
- Real-time updates: WebSocket/gRPC subscriptions

## Configuration

Blockchain providers are configured via environment variables and application config:

```env
# Canton
VITE_CANTON_LEDGER_URL=https://participant.dev.canton.wolfedgelabs.com/json-api
VITE_CANTON_PACKAGE_ID=b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0

# Future networks
VITE_ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
VITE_POLYGON_RPC_URL=https://polygon-rpc.com
```

## Benefits of This Architecture

1. **Flexibility**: Easy to switch between networks or support multiple networks
2. **Maintainability**: Clear separation of concerns, network-specific logic isolated
3. **Testability**: Each provider can be tested independently
4. **Extensibility**: New networks can be added without modifying existing code
5. **Future-proof**: Ready for full on-chain capabilities when available

## Best Practices

1. **Always check feature support**: Use `provider.supportsFeature()` before using features
2. **Handle network-specific errors**: Each network may have different error formats
3. **Implement fallbacks**: Use database fallback when on-chain features are unavailable
4. **Cache appropriately**: Cache results to reduce blockchain calls
5. **Monitor network status**: Track connection status and handle reconnections

## See Also

- [Canton Integration Guide](./CANTON_INTEGRATION.md) - Detailed Canton-specific integration
- [Architecture Overview](./ARCHITECTURE.md) - Overall application architecture
- [API Documentation](./API.md) - API endpoints and usage
