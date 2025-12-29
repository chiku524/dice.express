@echo off
REM Deploy DAR file to Canton with authentication

echo ==========================================
echo Deploy to Canton with Authentication
echo ==========================================
echo.

set CANTON_URL=https://participant.dev.canton.wolfedgelabs.com
set DAR_FILE=.daml\dist\prediction-markets-test-1.0.0.dar

REM Check if DAR file exists
if not exist "%DAR_FILE%" (
    echo ERROR: DAR file not found: %DAR_FILE%
    echo Please build the project first: dpm build
    pause
    exit /b 1
)

REM Get token
set /p TOKEN="Enter your Keycloak access token (or press Enter to get one): "

if "%TOKEN%"=="" (
    echo.
    echo Getting token...
    call scripts\get-keycloak-token.bat
    
    REM Try to extract token from response file
    if exist token-response.json (
        REM Use PowerShell to extract token (works on Windows)
        for /f "tokens=2 delims=:," %%a in ('type token-response.json ^| findstr "access_token"') do (
            set TOKEN=%%a
            set TOKEN=!TOKEN:"=!
            set TOKEN=!TOKEN: =!
        )
    )
)

if "%TOKEN%"=="" (
    echo.
    echo ERROR: No token provided
    echo Please get a token first or provide it manually
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
    echo Deployment failed. Trying v1 endpoint...
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

