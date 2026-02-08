# AMM (Automated Market Maker)

Single reference for AMM design, implementation, and algorithms. All amounts use **platform Credits** (virtual currency).

---

## 1. Design: DVP Transfer Workflows

We follow the **CIP-0056 Canton Network Token Standard** for Delivery versus Payment (DVP).

**Reference**: [CIP-0056](https://github.com/global-synchronizer-foundation/cips/blob/main/cip-0056/cip-0056.md#delivery-versus-payment-dvp-transfer-workflows)

### Principles

1. **Atomic Settlement**: All transfers in a single transaction (all-or-nothing).
2. **Allocation-Based Model**: Users allocate holdings to a settlement request; when all allocations are present, AMM submits one transaction to complete settlement. Allocations have deadlines.
3. **Workflow**: User initiates trade → AMM creates SettlementRequest → Wallets create Allocation contracts → AMM observes allocations → AMM executes atomic settlement.

### Pool Structure

- **Liquidity pools** track pending allocations and verify all required allocations before executing trades.
- **Deadlines**: Allocations valid until deadline; failed settlements free assets after expiry.
- **Multi-asset**: All required allocations must be present before settlement.

---

## 2. Implementation

### Core Templates (in `contracts/AMM.daml`)

1. **LiquidityPool** – Reserves per market (YES/NO or per outcome)
2. **SettlementRequest** – Tracks required allocations for a trade
3. **AllocationRequirement** – What each party must allocate
4. **Allocation** – Allocation contract created by wallets
5. **PoolFactory** – Creates new liquidity pools

### Constant Product Formula

- `x * y = k` for binary (YES/NO reserves).
- With fee: `Δy = (y * Δx * (1 - feeRate)) / (x + Δx * (1 - feeRate))`.
- Multi-outcome: separate reserve per outcome, same idea.

### DVP Flow

1. User initiates trade → AMM creates SettlementRequest  
2. User’s wallet creates Allocation  
3. Pool creates Allocation for output  
4. AMM records allocations → when all present, executes settlement  
5. Pool reserves updated via CompleteTradeSettlement  

### Market Types

- **Binary**: YES/NO reserves  
- **Multi-Outcome**: Reserve per outcome  

---

## 3. Algorithms & Roadmap

### Fee & Slippage

- **Slippage**: `minOutAmount` (trade reverts if output below).  
- **Deadline**: Trade must execute before timestamp.  
- **Fee display**: Show % and estimated fee in Credits.

### Fee Structure

- Trading fee from input; **platform fee share** (e.g. 20% of fee to platform, 80% to LPs).  
- Config: `feeRate`, `platformFeeShare` on LiquidityPool; optional overrides in PoolFactory CreatePool.  
- **Max trade size**: `maxTradeReserveFraction` (e.g. 10% of smallest reserve) to protect LPs and limit slippage; ensures users and platform do not lose from oversized trades.

### Optional Curves

- **LMSR**: For thin markets; bounded loss.  
- **Concentrated liquidity** (Phase 2): Liquidity in price ranges.

### Algorithm Hooks

- **Pricing**: Implied odds from pool state; API for current odds.  
- **Liquidity**: Initial liquidity guidance; low-liquidity alerts.  
- **Resolution**: Oracle/time-based/manual (see ORACLE_STRATEGY.md).

---

## 4. Integration

- **Contracts**: `contracts/AMM.daml` – LiquidityPool, ExecuteTrade, AddLiquidity, RemoveLiquidity.  
- **API**: Endpoints for pool state, odds, minOut.  
- **Frontend**: Trade form with amount, min out, deadline; fee and odds display.

---

## 5. References

- [CIP-0056](https://github.com/global-synchronizer-foundation/cips/blob/main/cip-0056/cip-0056.md)
- [Canton Token Standard](https://docs.dev.sync.global/app_dev/token_standard/index.html)
