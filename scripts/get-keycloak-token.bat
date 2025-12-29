@echo off
REM Get Keycloak access token for Canton devnet

echo ==========================================
echo Get Keycloak Access Token
echo ==========================================
echo.

set KEYCLOAK_URL=https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token

echo Keycloak Token Endpoint: %KEYCLOAK_URL%
echo.

REM Prompt for credentials
set /p USERNAME="Enter your Keycloak username: "
set /p PASSWORD="Enter your Keycloak password: "
set /p CLIENT_ID="Enter Client ID (or press Enter for 'canton-devnet'): "

if "%CLIENT_ID%"=="" set CLIENT_ID=canton-devnet

echo.
echo Requesting token...
echo.

REM Try password grant type first
curl -X POST "%KEYCLOAK_URL%" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "grant_type=password" ^
  -d "client_id=%CLIENT_ID%" ^
  -d "username=%USERNAME%" ^
  -d "password=%PASSWORD%" ^
  -o token-response.json

if errorlevel 1 (
    echo.
    echo ERROR: Failed to get token
    echo.
    echo Trying with client_credentials grant type...
    echo.
    set /p CLIENT_SECRET="Enter Client Secret (if required): "
    
    curl -X POST "%KEYCLOAK_URL%" ^
      -H "Content-Type: application/x-www-form-urlencoded" ^
      -d "grant_type=client_credentials" ^
      -d "client_id=%CLIENT_ID%" ^
      -d "client_secret=%CLIENT_SECRET%" ^
      -o token-response.json
)

if exist token-response.json (
    echo.
    echo Token response saved to token-response.json
    echo.
    type token-response.json
    echo.
    echo.
    echo To extract just the access token, you can use:
    echo   type token-response.json | findstr "access_token"
    echo.
    echo Or use jq if installed:
    echo   jq -r .access_token token-response.json
) else (
    echo.
    echo ERROR: No token response received
    echo.
    echo Please check:
    echo   1. Your username and password are correct
    echo   2. The Client ID is correct
    echo   3. Your account has the necessary permissions
    echo   4. Contact the devnet administrator for Client ID/Secret
)

echo.
pause

