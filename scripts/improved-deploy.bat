@echo off
REM Improved deploy script with better token extraction and debugging

setlocal enabledelayedexpansion

set KEYCLOAK_URL=https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token
set CLIENT_ID=Prediction-Market
set CANTON_URL=https://participant.dev.canton.wolfedgelabs.com
set DAR_FILE=test-contract\.daml\dist\prediction-markets-test-1.0.0.dar

echo ==========================================
echo Improved Deploy to Canton
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
echo Getting token from Keycloak...
echo URL: %KEYCLOAK_URL%
echo Client ID: %CLIENT_ID%
echo.

REM Get token and save response
curl -s -X POST "%KEYCLOAK_URL%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "grant_type=password" ^
  -d "client_id=%CLIENT_ID%" ^
  -d "username=!USERNAME!" ^
  -d "password=!PASSWORD!" ^
  -o token.json

echo.
echo Token response saved to token.json
echo.

REM Check for errors in response
findstr /i "error" token.json >nul
if not errorlevel 1 (
    echo ERROR: Token request failed!
    echo.
    echo Response:
    type token.json
    echo.
    pause
    exit /b 1
)

REM Extract token using PowerShell (more reliable)
echo Extracting access token...
for /f "delims=" %%i in ('powershell -NoProfile -Command "$json = Get-Content token.json -Raw | ConvertFrom-Json; if ($json.access_token) { Write-Output $json.access_token } else { Write-Output 'ERROR' }"') do set TOKEN=%%i

if "!TOKEN!"=="" (
    echo ERROR: Token extraction failed
    echo.
    echo Response was:
    type token.json
    echo.
    pause
    exit /b 1
)

if "!TOKEN!"=="ERROR" (
    echo ERROR: No access_token in response
    echo.
    echo Response was:
    type token.json
    echo.
    pause
    exit /b 1
)

echo Token extracted successfully!
echo Token length: !TOKEN:~0,50!... (showing first 50 chars)
echo.

REM Verify token format (should start with eyJ)
echo !TOKEN! | findstr /C:"eyJ" >nul
if errorlevel 1 (
    echo WARNING: Token doesn't look like a JWT (should start with 'eyJ')
    echo Token starts with: !TOKEN:~0,10!
)

echo.
echo ==========================================
echo Deploying to Canton
echo ==========================================
echo.
echo DAR file: %DAR_FILE%
echo Canton URL: %CANTON_URL%/v2/dars
echo.

REM Deploy with token
echo Sending deployment request...
curl -X POST "%CANTON_URL%/v2/dars" ^
  -H "Content-Type: application/octet-stream" ^
  -H "Authorization: Bearer !TOKEN!" ^
  --data-binary "@%DAR_FILE%" ^
  -w "\n\nHTTP Status Code: %{http_code}\n" ^
  -v 2>&1 | findstr /V "^[*]"

echo.
echo ==========================================
echo Deployment Complete
echo ==========================================
echo.
echo If you got an error, check:
echo   1. Token is valid (check token.json)
echo   2. Password is correct
echo   3. Client ID is correct
echo   4. User has required permissions
echo.
pause

