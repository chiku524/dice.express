# Migration to Token Standard API

## Client Request
Client has indicated that `daml-finance` is deprecated (last updated 8 months ago, uses SDK 2.10.0) and we should migrate to the Token Standard API from `docs.dev.sync.global/app_dev/token_standard/index.html`.

## Migration Plan

1. **Remove DA.Finance dependencies** - Remove all DA.Finance packages from `daml.yaml`
2. **Remove DA.Finance imports** - Remove all imports from DA.Finance modules
3. **Create simple token types** - Use basic DAML types for tokens instead of DA.Finance types
4. **Simplify templates** - Remove dependencies on DA.Finance interfaces (Account, Holding, Settlement)
5. **Update to use Token Standard API** - Implement using the Token Standard API patterns

## Current DA.Finance Usage

### Files using DA.Finance:
- `daml/PredictionMarkets.daml` - Uses Account, Holding, Settlement, Token types
- `daml/AMM.daml` - Uses Account, Holding, Settlement, Instrument types
- `daml/Setup.daml` - Uses Token types

### Types/Interfaces Used:
- `Daml.Finance.Interface.Account.V4.Account`
- `Daml.Finance.Interface.Holding.V4.Holding`
- `Daml.Finance.Interface.Settlement.V4.Instruction`
- `Daml.Finance.Interface.Types.Common.V3.Types` (Instrument, InstrumentKey)
- `Daml.Finance.Interface.Instrument.Token.V4.Types` (Token)

## Next Steps

1. Research Token Standard API documentation
2. Create simple token template using basic DAML
3. Replace DA.Finance types with simple types
4. Update all templates to work without DA.Finance
5. Test build

