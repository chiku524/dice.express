@echo off
REM Debug script to check token request and extraction

setlocal enabledelayedexpansion

set KEYCLOAK_URL=https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token
set CLIENT_ID=Prediction-Market

echo ==========================================
echo Debug Token Request
echo ==========================================
echo.

set /p USERNAME="Keycloak username (default: nico): "
if "!USERNAME!"=="" set USERNAME=nico
set /p PASSWORD="Keycloak password: "

if "!PASSWORD!"=="" (
    echo ERROR: Password required
    pause
    exit /b 1
)

echo.
echo Requesting token...
echo URL: %KEYCLOAK_URL%
echo Client ID: %CLIENT_ID%
echo Username: !USERNAME!
echo.

REM Get token with verbose output
curl -v -X POST "%KEYCLOAK_URL%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "grant_type=password" ^
  -d "client_id=%CLIENT_ID%" ^
  -d "username=!USERNAME!" ^
  -d "password=!PASSWORD!" ^
  -o token-response.json 2>token-verbose.log

echo.
echo ==========================================
echo Token Response
echo ==========================================
echo.
type token-response.json
echo.

REM Check for errors
findstr /i "error" token-response.json >nul
if not errorlevel 1 (
    echo.
    echo ERROR: Token request contains error!
    echo.
    echo Common errors:
    echo   - "invalid_grant": Wrong username/password
    echo   - "unauthorized_client": Client ID not authorized
    echo   - "invalid_client": Client ID doesn't exist
    echo.
    pause
    exit /b 1
)

REM Extract token
echo.
echo ==========================================
echo Extracting Token
echo ==========================================
echo.

for /f "delims=" %%i in ('powershell -NoProfile -Command "$json = Get-Content token-response.json -Raw | ConvertFrom-Json; if ($json.access_token) { Write-Output $json.access_token } else { Write-Output 'NO_TOKEN' }"') do set TOKEN=%%i

if "!TOKEN!"=="" (
    echo ERROR: Could not extract token
    pause
    exit /b 1
)

if "!TOKEN!"=="NO_TOKEN" (
    echo ERROR: No access_token in response
    echo.
    echo Response structure:
    powershell -NoProfile -Command "Get-Content token-response.json -Raw | ConvertFrom-Json | ConvertTo-Json"
    pause
    exit /b 1
)

echo Token extracted!
echo.
echo Token (first 100 chars): !TOKEN:~0,100!...
echo Token length: 
powershell -Command "Write-Output ('!TOKEN!'.Length)"
echo.

REM Verify JWT format
echo !TOKEN! | findstr /C:"eyJ" >nul
if errorlevel 1 (
    echo WARNING: Token doesn't start with 'eyJ' (not a standard JWT)
    echo Token starts with: !TOKEN:~0,20!
) else (
    echo Token format looks correct (JWT)
)

echo.
echo ==========================================
echo Token Details (decoded header)
echo ==========================================
echo.

REM Decode JWT header (first part before first dot)
for /f "tokens=1 delims=." %%a in ("!TOKEN!") do (
    echo Header (base64): %%a
    REM Try to decode (basic check)
)

echo.
echo ==========================================
echo Next Steps
echo ==========================================
echo.
echo 1. If you see an error above, check your password
echo 2. If token looks good, try deploying with improved-deploy.bat
echo 3. Save this token for testing: !TOKEN!
echo.
pause

