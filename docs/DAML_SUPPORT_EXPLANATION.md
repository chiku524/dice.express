# DAML Support Request: Package Dependency Issue

## Project Overview

We are building a **Prediction Markets Platform with Automated Market Maker (AMM)** on DAML/Canton. The project implements:

1. **Prediction Markets** - Binary and multi-outcome markets for event prediction
2. **AMM (Automated Market Maker)** - Liquidity pools following CIP-0056 DVP (Delivery versus Payment) workflows
3. **Market Creation & Settlement** - Admin-controlled market lifecycle with oracle resolution

## DAML Files Being Built

### 1. `daml/PredictionMarkets.daml` (498 lines)
**Purpose:** Core prediction market contracts

**Key Templates:**
- `MarketConfig` - Global configuration (fees, oracle party, stablecoin)
- `MarketCreationRequest` - Pending market creation requests (admin approval)
- `Market` - Active prediction markets (binary/multi-outcome)
- `Position` - User positions in markets (YES/NO/Outcome shares)

**Key Functionality:**
- Market creation with admin approval
- Position creation and management
- Market resolution via oracle
- Settlement and payout distribution

### 2. `daml/AMM.daml` (481 lines)
**Purpose:** Automated Market Maker for prediction market liquidity

**Key Templates:**
- `LiquidityPool` - AMM liquidity pools for market shares
- `SettlementRequest` - DVP settlement requests (CIP-0056 compliant)
- `AllocationRequirement` - Asset allocation requirements for settlement
- `Allocation` - User asset allocations for atomic settlement

**Key Functionality:**
- Liquidity provision and management
- AMM trading (swap operations)
- DVP (Delivery versus Payment) atomic settlement
- Allocation-based settlement workflow (CIP-0056)

### 3. `daml/Setup.daml` (51 lines)
**Purpose:** Setup script for initializing market configuration

## Why DA.Finance Packages Are Required

Our DAML code extensively uses DA.Finance interfaces and types for **financial operations**:

### 1. **Token Management** (`DA.Finance.Interface.Types.Token`)
- **Used in:** `MarketConfig.stablecoinCid : ContractId Token`
- **Purpose:** Reference to stablecoin token contract for market deposits and payouts
- **Example usage:**
  ```daml
  stablecoinCid : ContractId Token  -- USDC or other stablecoin
  ```

### 2. **Account Management** (`DA.Finance.Interface.Account`)
- **Used in:** `MarketCreationRequest.creatorAccount`, `adminAccount : Optional Account`
- **Purpose:** User accounts for holding assets and positions
- **Example usage:**
  ```daml
  creatorAccount : Optional Account  -- Creator's finance account
  adminAccount : Optional Account    -- Admin's finance account
  ```

### 3. **Holding Management** (`DA.Finance.Interface.Holding`)
- **Used in:** `MarketCreationRequest.depositCid : Optional (ContractId Holding)`
- **Purpose:** Holdings represent specific asset positions (e.g., 100 USDC)
- **Example usage:**
  ```daml
  depositCid : Optional (ContractId Holding)  -- Deposit holding for market creation
  ```

### 4. **Settlement Interface** (`DA.Finance.Interface.Settlement`)
- **Used in:** AMM DVP settlement workflows
- **Purpose:** Atomic settlement of multiple assets simultaneously (CIP-0056)
- **Example usage:**
  ```daml
  -- SettlementRequest template uses Settlement interface for atomic transfers
  -- Ensures delivery versus payment (DVP) - assets transfer atomically
  ```

### 5. **Common Types** (`DA.Finance.Interface.Types.Common`)
- **Used in:** `Instrument` type for asset identification
- **Purpose:** Standard types for financial instruments
- **Example usage:**
  ```daml
  instrumentId : Instrument  -- Identifies asset type (token, bond, etc.)
  ```

### 6. **Asset & Types** (`DA.Finance.Asset`, `DA.Finance.Types`)
- **Used in:** Asset representation and financial calculations
- **Purpose:** Core financial types and utilities

### 7. **Utilities** (`DA.Finance.Interface.Util`)
- **Used in:** Helper functions for finance operations
- **Purpose:** Common utilities for finance contracts

## Import Statements

**From `daml/PredictionMarkets.daml`:**
```daml
import DA.Finance.Asset
import DA.Finance.Types
import DA.Finance.Interface.Account
import DA.Finance.Interface.Holding
import DA.Finance.Interface.Settlement
import DA.Finance.Interface.Types.Common
import DA.Finance.Interface.Types.Token
import DA.Finance.Interface.Util
```

**From `daml/AMM.daml`:**
```daml
import DA.Finance.Asset
import DA.Finance.Types
import DA.Finance.Interface.Account
import DA.Finance.Interface.Holding
import DA.Finance.Interface.Settlement
import DA.Finance.Interface.Types.Common
import DA.Finance.Interface.Types.Token
```

## Current Build Configuration

**`daml.yaml`:**
```yaml
sdk-version: 3.4.9
name: prediction-markets
version: 1.0.0
source: daml
dependencies:
  - daml-stdlib
  - daml-script
  - daml-prim
data-dependencies:
  - .lib/daml-finance-interface-account.dar
  - .lib/daml-finance-interface-holding.dar
  - .lib/daml-finance-interface-settlement.dar
  - .lib/daml-finance-interface-types-common.dar
  - .lib/daml-finance-interface-instrument-token.dar
  - .lib/daml-finance-interface-util.dar
```

## The Problem

1. **DPM Cannot Auto-Resolve DA.Finance Packages:**
   - Running `dpm build` results in: `Package daml-finance-interface-account could not be found`
   - DPM only knows about `daml-stdlib`, `daml-script`, `daml-prim`
   - DA.Finance packages are not in DPM's default repository

2. **Manual Download Issues:**
   - Downloaded packages from GitHub releases (v4.0.0) appear to be LF version 1 format
   - SDK 3.4.9 cannot read LF version 1 packages: `"ParseError \"Lf1 is not supported\""`
   - File sizes suggest old packages (348KB vs expected larger v4 packages)

3. **Package Version Mismatch:**
   - SDK 3.4.9 targets LF 1.17
   - Downloaded packages appear to be LF version 1 (incompatible)
   - Need LF 1.17 compatible packages

## Questions for DAML Support

1. **How to configure DPM to use DA.Finance packages?**
   - Is there a package repository URL we should configure?
   - Do we need a `dpm.yaml` configuration file?
   - Can DPM automatically resolve DA.Finance dependencies?

2. **Correct Package Sources:**
   - Where should we download DA.Finance v4 packages for SDK 3.4.9?
   - Are the GitHub releases serving cached/old files?
   - What are the expected file sizes for LF 1.17 compatible packages?

3. **Package Compatibility:**
   - Which DA.Finance package versions are compatible with SDK 3.4.9 / LF 1.17?
   - Should we use v4.0.0 or a different version?
   - Is there a compatibility matrix we can reference?

4. **Alternative Approaches:**
   - Should we use a different SDK version that has better DA.Finance support?
   - Is there a different way to include DA.Finance packages in the build?

## Expected Outcome

Once packages are correctly configured:
- ✅ Build succeeds: `daml build` completes without errors
- ✅ DAR file created: `.daml/dist/prediction-markets-1.0.0.dar`
- ✅ Deployable to Canton participant node
- ✅ Prediction markets and AMM functionality operational

## Environment

- **OS:** Windows 10
- **DAML SDK:** 3.4.9
- **DPM:** 1.0.4 (installed)
- **Target:** Canton development network
- **Project:** Prediction Markets with AMM (CIP-0056 DVP workflows)

Thank you for your assistance!

