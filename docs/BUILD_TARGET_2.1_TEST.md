# Build Test with --target=2.1

## Test Result

Added `--target=2.1` to `daml.yaml` as suggested by client, but build still fails.

## Error

```
damlc.exe: user error (Protobuf error: "ParseError \"Lf1 is not supported\"")
```

## Analysis

The `--target=2.1` option tells the compiler to **target** LF version 2.1, but the **dependencies** (DA.Finance packages in `.lib/`) are still LF version 1, which causes the incompatibility.

## Issue

- ✅ **Our code**: Will compile to LF 2.1 (with `--target=2.1`)
- ❌ **DA.Finance packages**: Are LF version 1 (incompatible)
- ❌ **Result**: Parser error because it can't read LF 1 packages

## Solution Needed

We need **LF 2.1 compatible DA.Finance packages**, not just to target LF 2.1 in our code.

The packages in `.lib/` directory are:
- `daml-finance-interface-account.dar` - LF version 1
- `daml-finance-interface-holding.dar` - LF version 1
- `daml-finance-interface-settlement.dar` - LF version 1
- etc.

All are LF version 1, which is incompatible with SDK 3.4.9.

## Next Steps

1. **Get LF 2.1 compatible DA.Finance packages** - Need packages compiled for LF 2.1
2. **Or use compatible SDK version** - Use an SDK version that supports LF 1 packages
3. **Or build DA.Finance from source** - If source is available, build with LF 2.1 target

## Current Status

- ✅ `--target=2.1` added to `daml.yaml`
- ✅ dpm is working and in PATH
- ❌ Build still fails due to LF 1 packages in dependencies

