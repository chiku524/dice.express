# Response to Client - Build Target 2.1 Test

## Test Performed

Added `build-options: - --target=2.1` to `daml.yaml` as you suggested.

## Result

❌ **Build still fails** with the same error:
```
damlc.exe: user error (Protobuf error: "ParseError \"Lf1 is not supported\"")
```

## Analysis

The `--target=2.1` option tells the compiler to **target** LF version 2.1 for our code, but the **DA.Finance packages** in the `.lib/` directory are still **LF version 1**, which causes the incompatibility.

**The issue is:**
- ✅ Our code will compile to LF 2.1 (with `--target=2.1`)
- ❌ DA.Finance packages are LF version 1 (incompatible)
- ❌ Parser can't read LF 1 packages

## What We Need

We need **LF 2.1 compatible DA.Finance packages**, not just to target LF 2.1 in our code.

The packages currently in `.lib/` are all LF version 1:
- `daml-finance-interface-account.dar`
- `daml-finance-interface-holding.dar`
- `daml-finance-interface-settlement.dar`
- etc.

## Questions

1. **Where can we get LF 2.1 compatible DA.Finance packages?**
   - Are there packages compiled for LF 2.1 available?
   - Should we build them from source?

2. **Alternative approach:**
   - Should we use a different SDK version that supports LF 1 packages?
   - Or is there another way to get compatible packages?

3. **Package versions:**
   - Which version of DA.Finance packages are compatible with LF 2.1?

## Current Status

- ✅ `--target=2.1` added to `daml.yaml`
- ✅ dpm is working
- ❌ Build fails due to LF 1 packages in dependencies

Any guidance on getting LF 2.1 compatible DA.Finance packages would be greatly appreciated!

