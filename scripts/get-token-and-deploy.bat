@echo off
REM Get Keycloak token with Prediction-Market client and deploy

setlocal enabledelayedexpansion

echo ==========================================
echo Get Token and Deploy Test Contract
echo ==========================================
echo.

set KEYCLOAK_URL=https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token
set CLIENT_ID=Prediction-Market
set CANTON_URL=https://participant.dev.canton.wolfedgelabs.com
set DAR_FILE=test-contract\.daml\dist\prediction-markets-test-1.0.0.dar

echo Keycloak Token Endpoint: %KEYCLOAK_URL%
echo Client ID: %CLIENT_ID%
echo.

REM Get credentials
set /p USERNAME="Enter your Keycloak username: "
set /p PASSWORD="Enter your Keycloak password: "

echo.
echo Requesting token with Client ID: %CLIENT_ID%...
echo.

REM Try password grant type
curl -X POST "%KEYCLOAK_URL%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "grant_type=password" ^
  -d "client_id=%CLIENT_ID%" ^
  -d "username=%USERNAME%" ^
  -d "password=%PASSWORD%" ^
  -o token-response.json 2>nul

if errorlevel 1 (
    echo.
    echo Password grant failed. Trying without client_secret...
    echo.
    REM Try again with explicit scope
    curl -X POST "%KEYCLOAK_URL%" ^
      -H "Content-Type: application/x-www-form-urlencoded" ^
      -d "grant_type=password" ^
      -d "client_id=%CLIENT_ID%" ^
      -d "username=%USERNAME%" ^
      -d "password=%PASSWORD%" ^
      -d "scope=openid" ^
      -o token-response.json 2>nul
)

if not exist token-response.json (
    echo.
    echo ERROR: Failed to get token response
    pause
    exit /b 1
)

echo.
echo Token response received. Checking...
type token-response.json
echo.

REM Check if response contains error
findstr /i "error" token-response.json >nul
if not errorlevel 1 (
    echo.
    echo ERROR: Token request failed. Response contains error.
    echo Please check the response above.
    pause
    exit /b 1
)

REM Extract token (simple method - look for access_token)
REM Note: This is a simple extraction, may need jq for proper JSON parsing
for /f "tokens=2 delims=:," %%a in ('type token-response.json ^| findstr "access_token"') do (
    set TOKEN=%%a
    set TOKEN=!TOKEN:"=!
    set TOKEN=!TOKEN: =!
)

if "!TOKEN!"=="" (
    echo.
    echo WARNING: Could not extract token from response.
    echo Please manually extract the access_token from token-response.json
    echo.
    echo You can use PowerShell to extract:
    echo   powershell -Command "(Get-Content token-response.json | ConvertFrom-Json).access_token"
    echo.
    set /p TOKEN="Enter access token manually: "
)

if "!TOKEN!"=="" (
    echo ERROR: No token available
    pause
    exit /b 1
)

echo.
echo Token extracted successfully!
echo Token (first 50 chars): !TOKEN:~0,50!...
echo.

REM Check if DAR file exists
if not exist "%DAR_FILE%" (
    echo ERROR: DAR file not found: %DAR_FILE%
    echo Please build the test contract first:
    echo   cd test-contract
    echo   dpm build
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Deploying Test Contract
echo ==========================================
echo.
echo DAR file: %DAR_FILE%
echo Canton URL: %CANTON_URL%/v2/packages
echo.

REM Deploy with token
curl -X POST "%CANTON_URL%/v2/packages" ^
  -H "Content-Type: application/octet-stream" ^
  -H "Authorization: Bearer !TOKEN!" ^
  --data-binary "@%DAR_FILE%" ^
  -v

if errorlevel 1 (
    echo.
    echo v2 endpoint failed, trying v1...
    curl -X POST "%CANTON_URL%/v1/packages" ^
      -H "Content-Type: application/octet-stream" ^
      -H "Authorization: Bearer !TOKEN!" ^
      --data-binary "@%DAR_FILE%" ^
      -v
)

echo.
echo ==========================================
echo Deployment Complete
echo ==========================================
echo.
pause

