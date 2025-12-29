@echo off
REM Quick deploy script - prompts for credentials and deploys

setlocal enabledelayedexpansion

set KEYCLOAK_URL=https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token
set CLIENT_ID=Prediction-Market
set CANTON_URL=https://participant.dev.canton.wolfedgelabs.com
set DAR_FILE=test-contract\.daml\dist\prediction-markets-test-1.0.0.dar

echo ==========================================
echo Quick Deploy to Canton
echo ==========================================
echo.

REM Check DAR file
if not exist "%DAR_FILE%" (
    echo ERROR: DAR file not found
    echo Building test contract...
    cd test-contract
    dpm build
    cd ..
    if not exist "%DAR_FILE%" (
        echo ERROR: Build failed or DAR not found
        pause
        exit /b 1
    )
)

echo DAR file ready: %DAR_FILE%
echo.

REM Get credentials
set /p USERNAME="Keycloak username (default: nico): "
if "!USERNAME!"=="" set USERNAME=nico
set /p PASSWORD="Keycloak password: "

if "!PASSWORD!"=="" (
    echo ERROR: Password required
    pause
    exit /b 1
)

echo.
echo Getting token...
curl -s -X POST "%KEYCLOAK_URL%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "grant_type=password" ^
  -d "client_id=%CLIENT_ID%" ^
  -d "username=!USERNAME!" ^
  -d "password=!PASSWORD!" ^
  -o token.json

REM Check for errors
findstr /i "error" token.json >nul
if not errorlevel 1 (
    echo.
    echo ERROR: Token request failed
    type token.json
    pause
    exit /b 1
)

REM Extract token using PowerShell
for /f "delims=" %%i in ('powershell -Command "(Get-Content token.json | ConvertFrom-Json).access_token"') do set TOKEN=%%i

if "!TOKEN!"=="" (
    echo ERROR: Could not extract token
    type token.json
    pause
    exit /b 1
)

echo Token obtained!
echo.

echo Deploying to Canton...
curl -X POST "%CANTON_URL%/v2/packages" ^
  -H "Content-Type: application/octet-stream" ^
  -H "Authorization: Bearer !TOKEN!" ^
  --data-binary "@%DAR_FILE%" ^
  -w "\nHTTP Status: %{http_code}\n"

echo.
echo Done!
pause

