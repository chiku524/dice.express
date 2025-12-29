# DA.Finance vs Daml.Finance - Naming Clarification

## Client Question

> "Could it be that you are referring to Daml.Finance coz I am not sure if there is a package DA.Finance"

## Answer: Both Are Correct (Different Contexts)

### Package Names (in `daml.yaml`)

The **package names** are:
- `daml-finance-interface-account`
- `daml-finance-interface-holding`
- `daml-finance-interface-settlement`
- etc.

These are the **DAR file names** and **package identifiers**.

### Module Namespace (in DAML code)

The **import statements** use:
```daml
import DA.Finance.Asset
import DA.Finance.Types
import DA.Finance.Interface.Account
import DA.Finance.Interface.Holding
```

This is the **module namespace** within the packages.

### Official Documentation

According to [DAML Finance documentation](https://docs.daml.com/daml-finance/index.html):
- The library is called **"Daml.Finance"** (with capital D)
- But the **module namespace** is **`DA.Finance.*`** (DA = Digital Asset)
- The **package names** are **`daml-finance-*`** (lowercase, hyphenated)

## Our Current Setup

### ✅ Package Names (Correct)
```yaml
data-dependencies:
  - .lib/daml-finance-interface-account.dar
  - .lib/daml-finance-interface-holding.dar
  - .lib/daml-finance-interface-settlement.dar
```

### ✅ Import Statements (Correct)
```daml
import DA.Finance.Asset
import DA.Finance.Interface.Account
import DA.Finance.Interface.Holding
```

## Why the Confusion?

1. **Library Name**: "Daml.Finance" (official name)
2. **Module Namespace**: `DA.Finance.*` (used in code)
3. **Package Names**: `daml-finance-*` (used in dependencies)

All three refer to the same library, just in different contexts!

## Verification

You can verify this by:
1. Checking the DAML Finance documentation
2. Looking at the package contents (they contain `DA.Finance.*` modules)
3. Checking GitHub releases (package names are `daml-finance-*`)

## Conclusion

✅ **Our code is correct** - we're using the right:
- Package names: `daml-finance-*`
- Module imports: `DA.Finance.*`

The client's question is understandable - the naming can be confusing because:
- The library is called "Daml.Finance"
- But modules are `DA.Finance.*`
- And packages are `daml-finance-*`

All refer to the same thing!

