# DAML Code Deployment to Canton

## Overview

This guide explains how to deploy the updated DAML contracts to the Canton participant node. After making changes to DAML templates (like making fields Optional), you must rebuild and redeploy the DAR file to Canton.

## Prerequisites

1. **DAML SDK 2.8.0 or later**
   ```bash
   # Check if installed
   daml version
   
   # If not installed, download from:
   # https://github.com/digital-asset/daml/releases
   ```

2. **Access to Canton Participant**
   - Participant URL: `https://participant.dev.canton.wolfedgelabs.com`
   - Authentication credentials (if required by the participant)

3. **Built DAR File**
   - Location: `.daml/dist/prediction-markets-1.0.0.dar`
   - Created by running `daml build`

## Quick Deployment

### Option 1: Using the Deployment Script (Recommended)

```bash
# Make script executable (if on Unix/Linux/Mac)
chmod +x scripts/deploy-to-canton.sh

# Run deployment script
./scripts/deploy-to-canton.sh
```

The script will:
1. Build the DAML project
2. Upload the DAR file to Canton
3. Verify the deployment

### Option 2: Manual Deployment

```bash
# Step 1: Build DAML project
daml build

# Step 2: Upload DAR file
curl -X POST \
  https://participant.dev.canton.wolfedgelabs.com/v2/packages \
  -H "Content-Type: application/octet-stream" \
  --data-binary @.daml/dist/prediction-markets-1.0.0.dar
```

If v2 endpoint returns 404, try v1:

```bash
curl -X POST \
  https://participant.dev.canton.wolfedgelabs.com/v1/packages \
  -H "Content-Type: application/octet-stream" \
  --data-binary @.daml/dist/prediction-markets-1.0.0.dar
```

## Deployment Steps Explained

### Step 1: Build DAML Project

```bash
daml build
```

This command:
- Compiles all `.daml` files in the `daml/` directory
- Resolves dependencies from `daml.yaml`
- Creates a `.dar` (DAML Archive) file containing:
  - Compiled templates
  - Type definitions
  - All necessary dependencies

Output: `.daml/dist/prediction-markets-1.0.0.dar`

### Step 2: Upload to Canton

The DAR file must be uploaded to the Canton participant node so it can:
- Load the new template definitions
- Allow contracts to be created using the new templates
- Execute choices on the updated templates

**Endpoints to try:**
1. `/v2/packages` (newer API, recommended)
2. `/v1/packages` (legacy API, fallback)

### Step 3: Verify Deployment

After uploading, verify that:
1. The package was accepted (HTTP 200/201 response)
2. No errors were returned
3. The frontend can now create markets successfully

## Common Issues

### Issue: "Package endpoint returns 404"

**Possible causes:**
- Package upload endpoint not enabled on Canton participant
- Incorrect endpoint URL
- Participant configuration issue

**Solutions:**
- Contact Canton participant administrator
- Check Canton participant documentation
- Verify the participant URL is correct

### Issue: "Authentication required"

**Possible causes:**
- Participant requires authentication for package uploads
- Missing or invalid credentials

**Solutions:**
- Add authentication header to curl request:
  ```bash
  curl -X POST \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @.daml/dist/prediction-markets-1.0.0.dar \
    https://participant.dev.canton.wolfedgelabs.com/v2/packages
  ```
- Check with participant administrator for required authentication method

### Issue: "Package already exists"

**Possible causes:**
- Same version already uploaded
- Package ID conflict

**Solutions:**
- Increment version in `daml.yaml`:
  ```yaml
  version: 1.0.1  # Increment version
  ```
- Or use package upgrade/update endpoint (if available)

### Issue: "DAML build fails"

**Possible causes:**
- Syntax errors in DAML files
- Missing dependencies
- SDK version mismatch

**Solutions:**
- Check build errors for specific issues
- Verify `daml.yaml` dependencies are correct
- Ensure DAML SDK version matches (2.8.0)

## After Deployment

Once the DAR is successfully uploaded:

1. **Test Market Creation**
   - Try creating a market from the frontend
   - Verify it no longer fails with field validation errors

2. **Verify Template Changes**
   - The updated `MarketCreationRequest` template with Optional fields should now be active
   - Null values for `depositCid`, `configCid`, etc. should be accepted

3. **Monitor Logs**
   - Check Canton participant logs for any errors
   - Verify contracts are being created successfully

## Version Management

When updating DAML code:

1. **For minor changes** (like making fields Optional):
   - Usually safe to upload same version if participant allows overwrite
   - Or increment patch version (1.0.0 → 1.0.1)

2. **For breaking changes**:
   - Increment minor or major version (1.0.0 → 1.1.0)
   - Update frontend if template structure changed
   - Document migration steps if needed

## Alternative Deployment Methods

### Using DAML Script (if ledger access configured)

```bash
daml script \
  --ledger-host participant.dev.canton.wolfedgelabs.com \
  --ledger-port 443 \
  --dar .daml/dist/prediction-markets-1.0.0.dar \
  --script-name Setup:setup
```

### Using Canton Console/Admin Interface

If the participant provides a web interface or CLI:
1. Log in to Canton admin interface
2. Navigate to Packages section
3. Upload the DAR file through the interface

## Need Help?

If deployment fails:
1. Check Canton participant documentation
2. Contact the participant administrator
3. Verify network connectivity to participant URL
4. Check if DAML SDK version is compatible

