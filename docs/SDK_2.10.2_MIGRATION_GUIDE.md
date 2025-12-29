# Migration Guide: SDK 2.10.2

## Why Switch to SDK 2.10.2?

Based on research, **SDK 2.10.2** is specifically documented as having compatible DA.Finance packages via the `quickstart-finance` template. Since all our downloaded packages are LF version 1 (likely LF 1.15), SDK 2.10.2 which targets LF 1.15 should be compatible.

## Migration Steps

### Step 1: Install SDK 2.10.2

**In a terminal where `daml` command works** (desktop terminal, not Git Bash):

```bash
daml install 2.10.2
```

Verify installation:
```bash
daml version
# Should show: 2.10.2
```

### Step 2: Update daml.yaml

The `daml.yaml` has already been updated to:
```yaml
sdk-version: 2.10.2
```

### Step 3: Test Build

```bash
daml build
```

**Expected Results:**

✅ **Success**: If build completes, packages are compatible!
- DAR file will be at: `.daml/dist/prediction-markets-1.0.0.dar`
- You can proceed with deployment

❌ **"Lf1 is not supported"**: Packages are still incompatible
- May need to download packages specifically for SDK 2.10.2
- Try using quickstart-finance template to get correct packages

❌ **Other errors**: Code compatibility issues
- May need to adjust DAML code for SDK 2.10.2
- Check error messages for specific issues

### Step 4: Get Correct Packages (if needed)

If build still fails, try getting packages via quickstart-finance template:

```bash
# Create temporary quickstart-finance project
daml new quickstart-finance-test --template=quickstart-finance
cd quickstart-finance-test

# Download dependencies (Windows)
get-dependencies.bat

# Or (Unix/Mac)
./get-dependencies.sh

# Copy packages to your project
copy .lib\*.dar ..\..\.lib\
# Or on Unix/Mac:
# cp .lib/*.dar ../../.lib/

# Go back to your project
cd ..\..
```

## Code Compatibility

Our DAML code should be compatible with SDK 2.10.2 because it uses:
- ✅ Standard DAML features (no SDK 3.4.9-specific features)
- ✅ Standard DA.Finance interfaces
- ✅ Standard library functions

## Differences: SDK 2.10.2 vs 3.4.9

| Feature | SDK 2.10.2 | SDK 3.4.9 |
|---------|------------|-----------|
| LF Version | 1.15 | 1.17 |
| Package Manager | DAML Assistant | DPM (preferred) |
| Build Command | `daml build` | `daml build` or `dpm build` |
| DA.Finance Support | ✅ Via quickstart-finance | ⚠️ Package issues |

## Rollback Instructions

If SDK 2.10.2 doesn't work:

1. **Revert daml.yaml:**
   ```yaml
   sdk-version: 3.4.9
   ```

2. **Reinstall SDK 3.4.9:**
   ```bash
   daml install 3.4.9
   ```

3. **Wait for DAML support response** with correct package sources

## Next Steps After Successful Build

1. ✅ Build succeeds → Deploy to Canton
2. ✅ Test market creation
3. ✅ Test AMM functionality
4. ✅ Continue development

## Troubleshooting

### "SDK not installed"
- Run `daml install 2.10.2` in a terminal where `daml` works
- May need to open a new terminal after installation

### "Lf1 is not supported"
- Packages may still be wrong version
- Try quickstart-finance template approach
- Check package file sizes (should match quickstart-finance)

### Build succeeds but deployment fails
- Check Canton participant compatibility
- Verify DAR file was created
- Check deployment logs

