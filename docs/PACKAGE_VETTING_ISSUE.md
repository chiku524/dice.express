# Package Vetting Issue

## Error Message

```
"code":"JSON_API_PACKAGE_SELECTION_FAILED"
"cause":"No package with package-name 'prediction-markets' is consistently vetted by all hosting participants of party..."
```

## What This Means

Canton requires packages to be **vetted** (approved/authorized) before they can be used in contract creation. The package `prediction-markets` has been deployed, but it's not yet vetted by all hosting participants.

## Solutions

### Solution 1: Use Explicit Package ID (Trying Now)

Instead of using `#prediction-markets:Module:Template`, we're trying the explicit package ID format:
- `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0:Token:TokenBalance`

This might bypass the package name lookup issue.

### Solution 2: Vet the Package (Client Action Required)

The client needs to vet the package on Canton. This is typically done via:
- Canton console commands
- Admin API operations
- Configuration files

**Action Required**: Ask the client to vet the package `prediction-markets` (package ID: `b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`) for the party.

## Current Status

- ✅ Package deployed successfully
- ✅ Template IDs updated to correct format
- ❌ Package not vetted (blocking contract creation)
- ⏳ Trying explicit package ID format as workaround

## Next Steps

1. Test with explicit package ID format
2. If still failing, request client to vet the package
3. Verify package vetting status via Canton console/API

