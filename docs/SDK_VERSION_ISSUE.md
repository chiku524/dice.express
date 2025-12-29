# SDK Version Compatibility Issue

## Problem

We tried using SDK 2.10.0 to work around the API v2/v1 mismatch, but encountered compilation errors:

**Error**: `Couldn't match type 'Scenario' with 'Script'`

## Root Cause

SDK 2.10.0 uses `Scenario` type, while SDK 3.4.9 uses `Script` type. The `Setup.daml` file was written for SDK 3.4.9 syntax, which doesn't directly translate to SDK 2.10.0.

## Attempted Solutions

1. ✅ **Changed SDK version** in `daml.yaml` to 2.10.0
2. ❌ **Build failed** - Type mismatch between `Scenario` and `Script`
3. ❌ **Tried different imports** - `DA.Script`, `Daml.Script`, `DA.Scenario`
4. ❌ **Tried `script do` wrapper** - Still type mismatch

## The Real Issue

The problem isn't just the SDK version - it's that:
- **SDK 3.4.9** uses **v2 API** (which Canton doesn't support)
- **SDK 2.10.0** uses **v1 API** (which Canton supports)
- But **SDK 2.10.0** has different syntax that requires rewriting `Setup.daml`

## Options

### Option 1: Rewrite Setup.daml for SDK 2.10.0
Rewrite the script to use `Scenario` syntax instead of `Script`:
- Use `Scenario` type instead of `Script`
- Use `DA.Scenario` imports
- Adjust function calls to match SDK 2.10.0 API

**Pros**: Should work with Canton's v1 API
**Cons**: Requires significant code changes, may need to rebuild DAR

### Option 2: Contact Client About API Version
Ask client:
- Does Canton devnet support v2 API?
- If not, what's the recommended SDK version?
- Is there a way to enable v2 API on Canton?

**Pros**: Get authoritative answer
**Cons**: Requires waiting for client response

### Option 3: Use JSON API Instead
Continue working on JSON API scripts:
- Fix party allocation issues
- Fix template ID format
- Add proper authentication

**Pros**: JSON API is available (even if it has issues)
**Cons**: More manual work, less automated

## Recommendation

**Contact the client** with this specific question:

"DAML Script with SDK 3.4.9 tries to use v2 API (`com.daml.ledger.api.v2`), but Canton returns 'Method not found'. SDK 2.10.0 uses v1 API but requires different syntax. Should we:
1. Rewrite scripts for SDK 2.10.0?
2. Wait for Canton to support v2 API?
3. Use JSON API instead?"

## Current Status

- ✅ SDK 2.10.0 installed
- ❌ Build fails due to syntax differences
- ⏭️ Need to either rewrite code or get client guidance

## Next Steps

1. **Contact client** about API version compatibility
2. **OR** rewrite `Setup.daml` for SDK 2.10.0 syntax
3. **OR** continue with JSON API approach

