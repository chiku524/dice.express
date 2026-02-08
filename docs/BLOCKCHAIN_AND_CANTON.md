# Blockchain & Canton Integration

Single reference for multi-chain architecture and Canton (one supported network) integration. The platform is **virtual-first**: all trading and fees use **Credits**; real blockchain/crypto is used only for **deposits and withdrawals** across supported networks (Canton today; more chains planned).

---

## Architecture Overview

- **Network-agnostic**: Same interface across supported chains.
- **Extensible**: Add networks via `BlockchainRegistry` and provider classes.
- **Current**: Canton for ledger (contract creation, choice exercising); database for queries (Canton JSON API has no query endpoints).

### Core Components

1. **BlockchainProvider** (`frontend/src/services/blockchain/BlockchainProvider.js`) – Abstract interface: `connect`, `disconnect`, `getAccount`, `createContract`, `exerciseChoice`, `queryContracts`, `getContract`, `getSupportedFeatures`.
2. **BlockchainRegistry** – Registry of network providers; default network and per-network config.
3. **CantonProvider** – Canton implementation (hybrid: on-chain commands, database for queries).
4. **DepositWithdrawProvider** – Interface for deposit/withdraw per chain (see VIRTUAL_CURRENCY_AND_MULTICHAIN.md).

### Canton Current State

- **On-chain**: Contract creation, choice exercising (via JSON API).
- **Database**: Contract and position queries (Supabase); JSON API has no query endpoints.
- **Deposit/Withdraw**: CC token transfers on Canton; virtual balance credited/debited in platform.

### Migration: Database-First → Full On-Chain

- **Phase 1 (current)**: Commands on-chain; queries and position tracking from DB.
- **Phase 2**: When Canton adds query/events: on-chain queries + DB cache.
- **Phase 3**: Full on-chain; DB for indexing/performance only.

### Adding a New Blockchain

1. Implement a class extending `BlockchainProvider` (and optionally `DepositWithdrawProvider`).
2. Register with `blockchainRegistry.registerProvider(networkId, ProviderClass, config)`.
3. Use for that network’s deposit/withdraw or ledger operations.

### Configuration

```env
VITE_CANTON_LEDGER_URL=https://participant.dev.canton.wolfedgelabs.com/json-api
VITE_CANTON_PACKAGE_ID=<package-id>
# Future: VITE_ETHEREUM_RPC_URL, VITE_POLYGON_RPC_URL, etc.
```

### See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) – Application architecture  
- [API.md](./API.md) – API reference  
- [VIRTUAL_CURRENCY_AND_MULTICHAIN.md](./VIRTUAL_CURRENCY_AND_MULTICHAIN.md) – Deposits/withdrawals and Credits  
- [Canton Documentation](https://www.daml.com/canton)
