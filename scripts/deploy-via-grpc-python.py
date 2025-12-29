#!/usr/bin/env python3
"""
Deploy DAR file using gRPC Admin API
This is a template that will be updated once we receive the client's script
"""

import sys
import os
import json
import subprocess
from pathlib import Path

# Configuration
ADMIN_API_ENDPOINT = "participant.dev.canton.wolfedgelabs.com:443"
DAR_FILE = "test-contract/.daml/dist/prediction-markets-test-1.0.0.dar"
TOKEN_FILE = "token.json"

def get_token():
    """Get authentication token from token.json"""
    if not os.path.exists(TOKEN_FILE):
        print(f"ERROR: Token file not found: {TOKEN_FILE}")
        print("Please run get-keycloak-token.bat first")
        return None
    
    with open(TOKEN_FILE, 'r') as f:
        token_data = json.load(f)
        return token_data.get('access_token')

def check_dar_file():
    """Check if DAR file exists"""
    if not os.path.exists(DAR_FILE):
        print(f"ERROR: DAR file not found: {DAR_FILE}")
        print("Please build the test contract first:")
        print("  cd test-contract")
        print("  dpm build")
        return False
    return True

def main():
    print("=" * 50)
    print("Deploy DAR via gRPC Admin API")
    print("=" * 50)
    print()
    
    # Check DAR file
    if not check_dar_file():
        sys.exit(1)
    
    print(f"DAR file: {DAR_FILE}")
    print(f"Admin API: {ADMIN_API_ENDPOINT}")
    print()
    
    # Get token
    token = get_token()
    if not token:
        sys.exit(1)
    
    print("Token obtained.")
    print()
    print("=" * 50)
    print("NOTE: Waiting for client's gRPC script")
    print("=" * 50)
    print()
    print("The client will provide a script for uploading DAR files via gRPC admin-api.")
    print("Once received, this script will be updated with the correct gRPC commands.")
    print()
    print("For now, we have:")
    print(f"  - Admin API endpoint: {ADMIN_API_ENDPOINT}")
    print(f"  - DAR file ready: {DAR_FILE}")
    print(f"  - Authentication token: Ready")
    print()
    print("This script will need:")
    print("  1. gRPC Python library: pip install grpcio grpcio-tools")
    print("  2. Canton admin API proto files")
    print("  3. The exact service method for uploading DARs")
    print()

if __name__ == "__main__":
    main()

