#!/bin/bash
# Deploy DAR file using gRPC Admin API (Bash version)
# Based on client-provided script with proper vetting enabled

set -e  # Exit on error

# Configuration
DAR_DIRECTORY="./.daml/dist"
DAR_FILE="${DAR_DIRECTORY}/prediction-markets-1.0.0.dar"
PARTICIPANT_HOST="participant.dev.canton.wolfedgelabs.com"
CANTON_ADMIN_GRPC_PORT=443
CANTON_ADMIN_API_URL="${PARTICIPANT_HOST}:${CANTON_ADMIN_GRPC_PORT}"
CANTON_ADMIN_API_GRPC_BASE_SERVICE="com.digitalasset.canton.admin.participant.v30"
CANTON_ADMIN_API_GRPC_PACKAGE_SERVICE="${CANTON_ADMIN_API_GRPC_BASE_SERVICE}.PackageService"

# Token file
TOKEN_FILE="token.json"
JWT_TOKEN=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper function to format JSON
json() {
  declare input=${1:-$(</dev/stdin)}
  printf '%s' "${input}" | jq -c .
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}ERROR: jq is not installed${NC}"
    echo "Please install jq: https://stedolan.github.io/jq/download/"
    exit 1
fi

# Check if grpcurl is installed
if ! command -v grpcurl &> /dev/null; then
    echo -e "${RED}ERROR: grpcurl is not installed${NC}"
    echo "Please install grpcurl: https://github.com/fullstorydev/grpcurl"
    exit 1
fi

# Get JWT token
if [ -f "${TOKEN_FILE}" ]; then
    echo -e "${CYAN}Reading token from ${TOKEN_FILE}...${NC}"
    JWT_TOKEN=$(jq -r '.access_token' "${TOKEN_FILE}")
    
    if [ -z "${JWT_TOKEN}" ] || [ "${JWT_TOKEN}" = "null" ]; then
        echo -e "${RED}ERROR: No access_token found in ${TOKEN_FILE}${NC}"
        echo "Please run: scripts/get-keycloak-token.ps1 or provide token manually"
        exit 1
    fi
    
    echo -e "${GREEN}Token loaded (first 50 chars): ${JWT_TOKEN:0:50}...${NC}"
else
    echo -e "${YELLOW}WARNING: ${TOKEN_FILE} not found${NC}"
    echo "Please provide JWT token:"
    read -p "JWT Token: " JWT_TOKEN
    
    if [ -z "${JWT_TOKEN}" ]; then
        echo -e "${RED}ERROR: JWT token is required${NC}"
        exit 1
    fi
fi

# Check DAR file
if [ ! -f "${DAR_FILE}" ]; then
    echo -e "${RED}ERROR: DAR file not found: ${DAR_FILE}${NC}"
    echo ""
    echo "Please build the DAR file first:"
    echo "  daml build"
    exit 1
fi

echo -e "${GREEN}DAR file: ${DAR_FILE}${NC}"
DAR_SIZE=$(stat -f%z "${DAR_FILE}" 2>/dev/null || stat -c%s "${DAR_FILE}" 2>/dev/null || echo "unknown")
echo -e "Size: ${DAR_SIZE} bytes"
echo -e "${GREEN}Admin API: ${CANTON_ADMIN_API_URL}${NC}"
echo -e "${GREEN}Service: ${CANTON_ADMIN_API_GRPC_PACKAGE_SERVICE}.UploadDar${NC}"
echo ""

# Upload DAR function
upload_dar() {
    local dar_file=$1
    local dar_name=$(basename "${dar_file}")
    
    echo -e "${CYAN}==========================================${NC}"
    echo -e "${CYAN}Uploading DAR: ${dar_name}${NC}"
    echo -e "${CYAN}==========================================${NC}"
    echo ""
    
    # Base64 encode DAR file
    # Try different base64 commands for different Unix environments
    if command -v base64 &> /dev/null; then
        # Try GNU base64 first (Linux)
        if base64 --version 2>/dev/null | grep -q "GNU"; then
            BASE64_ENCODED_DAR=$(base64 -w 0 "${dar_file}")
        else
            # BSD base64 (macOS)
            BASE64_ENCODED_DAR=$(base64 -i "${dar_file}" | tr -d '\n')
        fi
    else
        echo -e "${RED}ERROR: base64 command not found${NC}"
        exit 1
    fi
    
    # Create gRPC request JSON
    # IMPORTANT: Client's script uses vet_all_packages=true and synchronize_vetting=true
    local grpc_upload_dar_request=$(cat <<EOF
{
  "dars": [{
    "bytes": "${BASE64_ENCODED_DAR}"
  }],
  "vet_all_packages": true,
  "synchronize_vetting": true
}
EOF
)
    
    echo -e "${CYAN}Sending gRPC request...${NC}"
    
    # Send gRPC request
    echo "${grpc_upload_dar_request}" | json | grpcurl \
        -insecure \
        -H "Authorization: Bearer ${JWT_TOKEN}" \
        -d @ \
        "${CANTON_ADMIN_API_URL}" \
        "${CANTON_ADMIN_API_GRPC_PACKAGE_SERVICE}.UploadDar"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}==========================================${NC}"
        echo -e "${GREEN}SUCCESS: DAR '${dar_name}' uploaded and vetted!${NC}"
        echo -e "${GREEN}==========================================${NC}"
        echo ""
    else
        echo ""
        echo -e "${RED}==========================================${NC}"
        echo -e "${RED}ERROR: Failed to upload DAR '${dar_name}'${NC}"
        echo -e "${RED}==========================================${NC}"
        echo ""
        exit 1
    fi
}

# Upload DAR file
if [ -f "${DAR_FILE}" ]; then
    upload_dar "${DAR_FILE}"
else
    echo -e "${RED}ERROR: DAR file not found: ${DAR_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}Deployment complete!${NC}"

