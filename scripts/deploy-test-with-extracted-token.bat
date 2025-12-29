@echo off
REM Deploy test contract using token extracted from browser

echo ==========================================
echo Deploy Test Contract to Canton
echo ==========================================
echo.

set CANTON_URL=https://participant.dev.canton.wolfedgelabs.com
set DAR_FILE=test-contract\.daml\dist\prediction-markets-test-1.0.0.dar

REM Check if DAR file exists
if not exist "%DAR_FILE%" (
    echo ERROR: DAR file not found: %DAR_FILE%
    echo.
    echo Please build the test contract first:
    echo   cd test-contract
    echo   dpm build
    pause
    exit /b 1
)

echo DAR file found: %DAR_FILE%
echo.

REM Get token from user
echo ==========================================
echo Token Instructions
echo ==========================================
echo.
echo 1. Open Keycloak account page in browser
echo 2. Open Developer Tools (F12)
echo 3. Go to Network tab
echo 4. Refresh the page
echo 5. Click on any request
echo 6. Go to Headers tab
echo 7. Find "authorization" header
echo 8. Copy the token (everything after "Bearer ")
echo.
set /p TOKEN="Paste your token here: "

if "%TOKEN%"=="" (
    echo.
    echo ERROR: No token provided
    pause
    exit /b 1
)

echo.
echo Deploying to Canton...
echo URL: %CANTON_URL%/v2/packages
echo.

REM Deploy with token
curl -X POST "%CANTON_URL%/v2/packages" ^
  -H "Content-Type: application/octet-stream" ^
  -H "Authorization: Bearer %TOKEN%" ^
  --data-binary "@%DAR_FILE%" ^
  -v

if errorlevel 1 (
    echo.
    echo v2 endpoint failed, trying v1...
    curl -X POST "%CANTON_URL%/v1/packages" ^
      -H "Content-Type: application/octet-stream" ^
      -H "Authorization: Bearer %TOKEN%" ^
      --data-binary "@%DAR_FILE%" ^
      -v
)

echo.
echo ==========================================
echo Deployment Complete
echo ==========================================
echo.
pause

