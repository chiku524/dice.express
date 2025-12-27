# AMM Implementation Guide

## Overview

The Automated Market Maker (AMM) implementation follows the **CIP-0056 Canton Network Token Standard** for Delivery versus Payment (DVP) transfer workflows, ensuring atomic settlement of all trades.

## Architecture

The AMM consists of several key templates:

### Core Templates

1. **LiquidityPool** - Manages liquidity reserves for a market
2. **SettlementRequest** - Tracks required allocations for a trade
3. **AllocationRequirement** - Specifies what each party must allocate
4. **Allocation** - Actual allocation contract created by wallets
5. **PoolFactory** - Factory for creating new liquidity pools

## Key Features

### 1. Constant Product AMM Formula

Uses the standard `x * y = k` formula for price discovery:
- For buying YES shares with CC: `(x + Δx)(y - Δy) = x*y`
- Includes fee calculation: `Δy = (y * Δx * (1 - feeRate)) / (x + Δx * (1 - feeRate))`

### 2. DVP Transfer Workflow

Follows CIP-0056 allocation-based settlement:

```
1. User initiates trade → AMM creates SettlementRequest
2. SettlementRequest specifies required allocations
3. User's wallet creates Allocation contract
4. Pool creates Allocation for output asset
5. AMM observes all allocations present
6. AMM executes atomic settlement transaction
7. All transfers execute atomically
```

### 3. Support for Market Types

- **Binary Markets**: YES/NO shares with separate reserves
- **Multi-Outcome Markets**: Separate reserves for each outcome

## Usage Examples

### Creating a Liquidity Pool

```daml
-- Via PoolFactory
exercise factoryCid CreatePool with
  poolId = "pool-market-123"
  marketId = "market-123"
  marketCid = marketCid
  initialYesReserve = 1000.0
  initialNoReserve = 1000.0
  initialOutcomeReserves = fromList []
  feeRate = Some 0.003  -- 0.3% fee
  minLiquidity = Some 100.0
```

### Adding Liquidity

```daml
exercise poolCid AddLiquidity with
  provider = providerParty
  yesAmount = 500.0
  noAmount = 500.0
  outcomeAmounts = fromList []
  yesHoldingCid = Some yesHoldingCid
  noHoldingCid = Some noHoldingCid
  outcomeHoldings = fromList []
```

### Executing a Trade

```daml
-- Step 1: Create trade request (creates SettlementRequest)
settlementRequestCid <- exercise poolCid ExecuteTrade with
  trader = traderParty
  tradeType = Yes  -- Buying YES shares
  inputAmount = 100.0  -- 100 CC
  inputInstrumentId = ccInstrument
  minOutputAmount = 45.0  -- Slippage protection
  deadline = tradeDeadline

-- Step 2: User's wallet creates Allocation
allocationCid <- create Allocation with
  allocationId = "alloc-123"
  settlementRequestId = settlementRequestId
  party = traderParty
  instrumentId = ccInstrument
  quantity = 100.0
  holdingCid = ccHoldingCid
  deadline = tradeDeadline
  poolId = poolId
  createdAt = currentTime

-- Step 3: Pool creates Allocation for output
poolAllocationCid <- create Allocation with
  allocationId = "alloc-pool-123"
  settlementRequestId = settlementRequestId
  party = poolOperator
  instrumentId = yesSharesInstrument
  quantity = outputAmount
  holdingCid = yesSharesHoldingCid
  deadline = tradeDeadline
  poolId = poolId
  createdAt = currentTime

-- Step 4: AMM records allocations
exercise settlementRequestCid RecordAllocation with
  party = traderParty
  instrumentId = ccInstrument
  allocationCid = allocationCid

exercise settlementRequestCid RecordAllocation with
  party = poolOperator
  instrumentId = yesSharesInstrument
  allocationCid = poolAllocationCid

-- Step 5: Execute settlement (when all allocations present)
exercise settlementRequestCid ExecuteSettlement

-- Step 6: Update pool reserves
exercise poolCid CompleteTradeSettlement with
  settlementRequestCid = settlementRequestCid
  inputAmount = 100.0
  outputAmount = calculatedOutput
  tradeType = Yes
```

## Integration with Existing Markets

The AMM operates alongside the existing `Market` template:

1. **Markets** handle position creation and settlement
2. **LiquidityPools** provide liquidity for market shares
3. Users can either:
   - Create positions directly (current flow)
   - Trade via AMM for better liquidity

## Security Considerations

1. **Atomic Settlement**: All transfers execute in a single transaction
2. **Slippage Protection**: `minOutputAmount` parameter prevents unfavorable trades
3. **Deadline Management**: Allocations expire if settlement doesn't complete
4. **Minimum Liquidity**: Prevents pool drainage via `minLiquidity` requirement

## Future Enhancements

1. **Full Settlement Interface Integration**: Complete integration with `DA.Finance.Interface.Settlement`
2. **LP Token Tracking**: Implement proper LP token contracts
3. **Dynamic Fee Adjustment**: Adjust fees based on pool utilization
4. **Multi-Hop Routing**: Support trading across multiple pools
5. **Gas Optimization**: Optimize for lower transaction costs

## References

- [CIP-0056 Specification](https://github.com/global-synchronizer-foundation/cips/blob/main/cip-0056/cip-0056.md)
- [AMM DVP Design Document](./AMM_DVP_DESIGN.md)
- [Canton Network Token Standard](https://docs.dev.sync.global/app_dev/token_standard/index.html)

