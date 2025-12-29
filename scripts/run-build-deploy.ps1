# Wrapper script that bypasses execution policy
# This script runs the build-and-deploy script with bypassed execution policy

powershell -ExecutionPolicy Bypass -File ".\scripts\build-and-deploy-to-canton.ps1"

