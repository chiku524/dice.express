#!/bin/bash
# List deployed packages via gRPC Admin API or JSON API

set -e

# Configuration
TOKEN_FILE=${TOKEN_FILE:-"token.json"}
USE_JSON_API=${USE_JSON_API:-false}

PARTICIPANT_HOST="participant.dev.canton.wolfedgelabs.com"
ADMIN_API_PORT=443
ADMIN_API_URL="${PARTICIPANT_HOST}:${ADMIN_API_PORT}"
JSON_API_URL="https://participant.dev.canton.wolfedgelabs.com/json-api"
PACKAGE_SERVICE="com.digitalasset.canton.admin.participant.v30.PackageService"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}List Deployed Packages${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

# Get token
if [ ! -f "${TOKEN_FILE}" ]; then
    echo -e "${RED}ERROR: Token file not found: ${TOKEN_FILE}${NC}"
    exit 1
fi

JWT_TOKEN=$(jq -r '.access_token' "${TOKEN_FILE}")

if [ -z "${JWT_TOKEN}" ] || [ "${JWT_TOKEN}" = "null" ]; then
    echo -e "${RED}ERROR: No access_token found in ${TOKEN_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}Token loaded${NC}"
echo ""

if [ "${USE_JSON_API}" = "true" ]; then
    # Try JSON API
    echo -e "${CYAN}Querying packages via JSON API...${NC}"
    echo -e "Endpoint: ${JSON_API_URL}/v2/packages"
    echo ""
    
    response=$(curl -s -H "Authorization: Bearer ${JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        "${JSON_API_URL}/v2/packages")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}==========================================${NC}"
        echo -e "${GREEN}Deployed Packages (JSON API)${NC}"
        echo -e "${GREEN}==========================================${NC}"
        echo ""
        echo "${response}" | jq '.'
    else
        echo -e "${RED}ERROR: Failed to query packages via JSON API${NC}"
    fi
else
    # Try gRPC Admin API
    if ! command -v grpcurl &> /dev/null; then
        echo -e "${RED}ERROR: grpcurl not found${NC}"
        echo "Set USE_JSON_API=true to use JSON API instead"
        exit 1
    fi
    
    echo -e "${CYAN}Querying packages via gRPC Admin API...${NC}"
    echo -e "Endpoint: ${ADMIN_API_URL}"
    echo -e "Service: ${PACKAGE_SERVICE}.ListPackages"
    echo ""
    
    list_request='{}'
    
    output=$(echo "${list_request}" | grpcurl \
        -insecure \
        -H "Authorization: Bearer ${JWT_TOKEN}" \
        -d @ \
        "${ADMIN_API_URL}" \
        "${PACKAGE_SERVICE}.ListPackages" 2>&1)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}==========================================${NC}"
        echo -e "${GREEN}Deployed Packages (gRPC Admin API)${NC}"
        echo -e "${GREEN}==========================================${NC}"
        echo ""
        echo "${output}"
    else
        echo -e "${RED}ERROR: Failed to list packages${NC}"
        echo "${output}"
    fi
fi

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Package Information${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo -e "${YELLOW}Expected Package ID: b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0${NC}"
echo -e "${YELLOW}Package Name: prediction-markets${NC}"
echo ""
echo -e "${CYAN}View packages in block explorer:${NC}"
echo -e "  https://devnet.ccexplorer.io/"
echo ""

