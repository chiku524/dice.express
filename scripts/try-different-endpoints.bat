@echo off
REM Try deploying to different Canton endpoints

setlocal enabledelayedexpansion

set CANTON_URL=https://participant.dev.canton.wolfedgelabs.com
set DAR_FILE=test-contract\.daml\dist\prediction-markets-test-1.0.0.dar

echo ==========================================
echo Try Different Canton Endpoints
echo ==========================================
echo.

REM Get token from existing file or request new one
if exist token.json (
    echo Using existing token.json...
    for /f "delims=" %%i in ('powershell -NoProfile -Command "$json = Get-Content token.json -Raw | ConvertFrom-Json; if ($json.access_token) { Write-Output $json.access_token } else { Write-Output 'NO_TOKEN' }"') do set TOKEN=%%i
) else (
    echo No token.json found. Please run improved-deploy.bat first to get a token.
    pause
    exit /b 1
)

if "!TOKEN!"=="" (
    echo ERROR: Could not extract token
    pause
    exit /b 1
)

if "!TOKEN!"=="NO_TOKEN" (
    echo ERROR: No access_token in token.json
    pause
    exit /b 1
)

echo Token ready (first 50 chars): !TOKEN:~0,50!...
echo.

REM Try different endpoints
set ENDPOINTS=/v2/packages /v1/packages /packages /api/v2/packages /api/v1/packages

for %%E in (%ENDPOINTS%) do (
    echo.
    echo ==========================================
    echo Trying: %CANTON_URL%%%E
    echo ==========================================
    echo.
    
    curl -X POST "%CANTON_URL%%%E" ^
      -H "Content-Type: application/octet-stream" ^
      -H "Authorization: Bearer !TOKEN!" ^
      --data-binary "@%DAR_FILE%" ^
      -w "\nHTTP Status: %%{http_code}\n" ^
      -s
    
    echo.
    echo.
)

echo ==========================================
echo All Endpoints Tried
echo ==========================================
echo.
pause

