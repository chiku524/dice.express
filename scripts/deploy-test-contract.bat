@echo off
REM Deploy test contract to Canton devnet

echo ==========================================
echo Deploying Test Contract to Canton
echo ==========================================
echo.

set TEST_DIR=test-contract
if not exist %TEST_DIR% (
    echo ERROR: Test contract not built. Run test-contract-build.bat first.
    pause
    exit /b 1
)

cd %TEST_DIR%

set DAR_FILE=.daml\dist\prediction-markets-test-1.0.0.dar
if not exist %DAR_FILE% (
    echo ERROR: DAR file not found: %DAR_FILE%
    echo Please build the test contract first.
    cd ..
    pause
    exit /b 1
)

echo DAR file found: %DAR_FILE%
echo.

set CANTON_URL=https://participant.dev.canton.wolfedgelabs.com

echo Uploading to Canton participant...
echo URL: %CANTON_URL%
echo.

REM Try v2 endpoint first
curl -X POST "%CANTON_URL%/v2/packages" ^
  -H "Content-Type: application/octet-stream" ^
  --data-binary "@%DAR_FILE%" ^
  -v

if errorlevel 1 (
    echo.
    echo v2 endpoint failed, trying v1...
    curl -X POST "%CANTON_URL%/v1/packages" ^
      -H "Content-Type: application/octet-stream" ^
      --data-binary "@%DAR_FILE%" ^
      -v
)

cd ..

echo.
echo ==========================================
echo Deployment Complete
echo ==========================================
echo.
pause

