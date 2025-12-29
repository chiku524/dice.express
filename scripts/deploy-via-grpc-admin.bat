@echo off
REM Deploy DAR file using gRPC Admin API
REM This script will be updated once we receive the client's script

setlocal enabledelayedexpansion

set ADMIN_API_URL=participant.dev.canton.wolfedgelabs.com:443
set ADMIN_API_ENDPOINT=https://participant.dev.canton.wolfedgelabs.com/admin-api
set DAR_FILE=test-contract\.daml\dist\prediction-markets-test-1.0.0.dar

echo ==========================================
echo Deploy DAR via gRPC Admin API
echo ==========================================
echo.

REM Check DAR file
if not exist "%DAR_FILE%" (
    echo ERROR: DAR file not found: %DAR_FILE%
    echo Please build the test contract first:
    echo   cd test-contract
    echo   dpm build
    pause
    exit /b 1
)

echo DAR file: %DAR_FILE%
echo Admin API: %ADMIN_API_ENDPOINT%
echo.

REM Get token if not already available
if not exist token.json (
    echo Getting authentication token...
    call scripts\get-keycloak-token.bat
    if not exist token.json (
        echo ERROR: Could not get token
        pause
        exit /b 1
    )
)

REM Extract token
for /f "delims=" %%i in ('powershell -NoProfile -Command "$json = Get-Content token.json -Raw | ConvertFrom-Json; if ($json.access_token) { Write-Output $json.access_token } else { Write-Output 'ERROR' }"') do set TOKEN=%%i

if "!TOKEN!"=="" (
    echo ERROR: Could not extract token
    pause
    exit /b 1
)

echo Token obtained.
echo.

echo ==========================================
echo NOTE: Waiting for client's gRPC script
echo ==========================================
echo.
echo The client will provide a script for uploading DAR files via gRPC admin-api.
echo Once received, this script will be updated with the correct gRPC commands.
echo.
echo For now, we have:
echo   - Admin API endpoint: %ADMIN_API_ENDPOINT%
echo   - DAR file ready: %DAR_FILE%
echo   - Authentication token: Ready
echo.
echo Options for gRPC deployment:
echo   1. Use grpcurl (if installed)
echo   2. Use Python gRPC client
echo   3. Use Node.js gRPC client
echo   4. Use the client's provided script
echo.
pause

