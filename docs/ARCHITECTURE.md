# Architecture Documentation

## Overview

The application is a multi-chain prediction markets platform with a virtual Credits model: all trading and fees use Credits; blockchain is used only for deposits and withdrawals. It supports multiple networks (e.g. Canton, with more planned) and uses DAML smart contracts where applicable, with a React frontend for user interaction.

## System Architecture

```
┌─────────────────┐
│   React Frontend │
│   (User Interface)│
└────────┬─────────┘
         │
         │ HTTP/WebSocket
         │
┌────────▼─────────────────────────┐
│   Canton Participant Node        │
│   (JSON API + Ledger)             │
└────────┬─────────────────────────┘
         │
         │ DAML Contracts
         │
┌────────▼─────────────────────────┐
│   DAML Smart Contracts            │
│   - Market                        │
│   - Position                      │
│   - MarketCreationRequest         │
│   - OracleDataFeed                │
│   - MarketConfig                  │
└───────────────────────────────────┘
         │
         │
┌────────▼─────────────────────────┐
│   Oracle Service                 │
│   (RedStone Integration)          │
└───────────────────────────────────┘
```

## DAML Contract Architecture

### Core Templates

#### MarketConfig
Global configuration template that stores:
- Fee rates (market creation, position changes, settlement)
- Admin party
- Oracle party
- Stablecoin contract reference
- Market creation deposit amount

#### MarketCreationRequest
Template for pending market creation requests:
- Requires 100 CC deposit
- Awaits admin approval
- On approval: creates Market contract and returns deposit (minus optional fee)
- On rejection: returns full deposit

#### Market
Core market template managing:
- Market state (Active, Resolving, Settled, PendingApproval)
- Aggregated volumes (total, yes, no, per-outcome)
- Position references (private, only IDs stored)
- Settlement process (multi-step)
- Resolution data from oracle

#### Position
Private position template:
- Only visible to owner
- Stores position type, amount, price
- Can be updated or archived by owner

#### OracleDataFeed
Oracle data feed template:
- Published by oracle party
- Contains market resolution data
- Timestamped and optionally signed

## Privacy Model

### Data Visibility

1. **Market Data**: Public aggregated data visible to all
   - Total volume
   - Yes/No volumes
   - Outcome volumes (for multi-outcome)
   - Market status

2. **Position Data**: Private to position owner
   - Only the position owner can view their positions
   - Market contract only stores position contract IDs, not details

3. **Market Creation**: Private between creator and admin
   - Creation requests are only visible to creator and admin

## Market Lifecycle

1. **Creation Request**
   - User creates MarketCreationRequest with 100 CC deposit
   - Request is pending admin approval

2. **Approval**
   - Admin approves → Market contract created, deposit returned (minus fee)
   - Admin rejects → Deposit returned, request archived

3. **Active Trading**
   - Users create positions (buy/sell)
   - Positions are private to owners
   - Market aggregates volumes

4. **Resolution**
   - Step 1: Admin triggers StartResolution with oracle data
   - Step 2: Admin resolves outcome (ResolveOutcome)
   - Step 3: Admin executes settlement (ExecuteSettlement)

5. **Settled**
   - Market marked as Settled
   - Winnings distributed (via Settlement interface)

## Settlement Process

### Multi-Step Settlement

1. **StartResolution**: Market status → Resolving
   - Oracle data provided
   - Settlement step = 1

2. **ResolveOutcome**: Determine winning outcome
   - Validates outcome against market type
   - Settlement step = 2

3. **ExecuteSettlement**: Transfer winnings
   - Calculates payouts
   - Transfers stablecoin to winners
   - Settlement step = 3
   - Market status → Settled

### Settlement Triggers

- **TimeBased**: Resolves at specified time
- **EventBased**: Resolves when oracle data indicates event occurred
- **Manual**: Admin manually triggers resolution

## Oracle Integration

### RedStone Oracle

The oracle service:
1. Fetches data from RedStone API
2. Publishes OracleDataFeed contracts on ledger
3. Monitors markets for resolution triggers
4. Automatically triggers market resolution when conditions are met

### Oracle Data Flow

```
RedStone API → Oracle Service → OracleDataFeed Contract → Market Resolution
```

## Frontend Architecture

### Components

- **App**: Main application shell with routing
- **MarketsList**: Browse all active markets
- **MarketDetail**: View market details and create positions
- **CreateMarket**: Create new market request
- **Portfolio**: View user's positions
- **WalletConnect**: Wallet connection UI

### State Management

- **useLedger**: Manages Canton ledger connection
- **useWallet**: Manages wallet state and authentication
- React Query for data fetching and caching

### Real-Time Updates

- WebSocket connection to Canton ledger
- Automatic state synchronization
- Live updates for market data and positions

## Security Considerations

1. **On-Ledger Immutability**: All transactions are recorded on-ledger
2. **Privacy Boundaries**: Enforced at contract level
3. **Admin Controls**: All admin actions are traceable
4. **Wallet Security**: Passkey-based authentication
5. **Oracle Verification**: Oracle data can be signed and verified

## Performance Optimizations

1. **Aggregated Data**: Only aggregated volumes stored on market
2. **Private Positions**: Positions stored separately, not in market
3. **Efficient Queries**: Indexed queries by market ID and party
4. **WebSocket Updates**: Real-time updates without polling

## Future Enhancements & Platform Vision

See **[PLATFORM_VISION_AND_ROADMAP.md](./PLATFORM_VISION_AND_ROADMAP.md)** for the full strategy:

- **Virtual currency** (Credits) for all platform activity; multi-chain **deposits/withdrawals** only
- **Prediction styles**: Yes/No, True/False, Happens/Doesn't, Multi-outcome (see [PREDICTION_STYLES_SPEC.md](./PREDICTION_STYLES_SPEC.md))
- **Categories** (Finance, Sports, Politics, etc.) and **oracles** per category ([ORACLE_STRATEGY.md](./ORACLE_STRATEGY.md))
- **AMM & algorithms**: [AMM.md](./AMM.md)
- **Multi-chain**: [VIRTUAL_CURRENCY_AND_MULTICHAIN.md](./VIRTUAL_CURRENCY_AND_MULTICHAIN.md), [BLOCKCHAIN_AND_CANTON.md](./BLOCKCHAIN_AND_CANTON.md)

1. **Governance**: Replace admin controls with governance mechanism
2. **Advanced Analytics**: Market analytics and charts
3. **Mobile App**: Native mobile application
4. **Multi-Chain**: Support for multiple blockchain networks (deposit/withdraw)
5. **Advanced Settlement**: Automated settlement with more complex logic

