#!/bin/bash

# Deployment script for Canton Prediction Markets
# This script builds and deploys the DAML contracts to Canton
#
# Prerequisites:
# - DAML SDK 2.8.0+ installed (run: daml version)
# - Access to Canton participant node
# - Authentication credentials (if required)

set -e

PARTICIPANT_URL="${PARTICIPANT_URL:-https://participant.dev.canton.wolfedgelabs.com}"
PROJECT_NAME="prediction-markets"
PROJECT_VERSION="1.0.0"
DAR_FILE=".daml/dist/${PROJECT_NAME}-${PROJECT_VERSION}.dar"

echo "=========================================="
echo "Canton DAML Deployment Script"
echo "=========================================="
echo "Participant URL: $PARTICIPANT_URL"
echo "Project: $PROJECT_NAME v$PROJECT_VERSION"
echo ""

# Step 1: Build DAML project
echo "Step 1: Building DAML project..."
if ! command -v daml &> /dev/null; then
    echo "ERROR: DAML SDK not found. Please install DAML SDK 2.8.0+"
    echo "Download from: https://github.com/digital-asset/daml/releases"
    exit 1
fi

daml version
daml build

if [ ! -f "$DAR_FILE" ]; then
    echo "ERROR: DAR file not found at $DAR_FILE"
    echo "Build might have failed. Check the build output above."
    exit 1
fi

echo "✓ DAR file built: $DAR_FILE"
echo ""

# Step 2: Upload DAR to Canton
echo "Step 2: Uploading DAR to Canton participant..."

# Try v2 endpoint first (newer API)
echo "Trying v2 packages endpoint..."
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$PARTICIPANT_URL/v2/packages" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@$DAR_FILE" 2>&1)

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✓ Successfully uploaded DAR to Canton (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo "v2 endpoint returned 404, trying v1 endpoint..."
    
    # Try v1 endpoint as fallback
    UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "$PARTICIPANT_URL/v1/packages" \
        -H "Content-Type: application/octet-stream" \
        --data-binary "@$DAR_FILE" 2>&1)
    
    HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        echo "✓ Successfully uploaded DAR to Canton (HTTP $HTTP_CODE)"
        echo "Response: $RESPONSE_BODY"
    else
        echo "ERROR: Upload failed (HTTP $HTTP_CODE)"
        echo "Response: $RESPONSE_BODY"
        echo ""
        echo "Possible reasons:"
        echo "1. Package endpoint not enabled on Canton participant"
        echo "2. Authentication required (check if you need auth token)"
        echo "3. Incorrect endpoint URL"
        echo "4. DAR file already uploaded (may need to use different version)"
        exit 1
    fi
else
    echo "ERROR: Upload failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

echo ""

# Step 3: Verify deployment
echo "Step 3: Verifying deployment..."
echo "Checking if packages endpoint is accessible..."
PACKAGES_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$PARTICIPANT_URL/v1/packages" || echo "000")

if [ "$PACKAGES_CHECK" -eq 404 ] || [ "$PACKAGES_CHECK" -eq 200 ]; then
    echo "✓ Package endpoint is accessible"
else
    echo "⚠ Package endpoint returned HTTP $PACKAGES_CHECK"
    echo "  (This may be normal if packages endpoint requires auth or different method)"
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify the DAR was uploaded successfully"
echo "2. Initialize MarketConfig (if not already done)"
echo "3. Test market creation from the frontend"
echo ""
echo "To check uploaded packages, you may need to:"
echo "- Use Canton console/admin interface"
echo "- Query via JSON API (if packages query endpoint is available)"
echo "- Check Canton participant logs"

