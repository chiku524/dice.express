@echo off
REM Deployment script for Canton Prediction Markets (Windows)
REM This script builds and deploys the DAML contracts to Canton

setlocal enabledelayedexpansion

set PARTICIPANT_URL=%PARTICIPANT_URL%
if "%PARTICIPANT_URL%"=="" set PARTICIPANT_URL=https://participant.dev.canton.wolfedgelabs.com
set PROJECT_NAME=prediction-markets
set PROJECT_VERSION=1.0.0
set DAR_FILE=.daml\dist\%PROJECT_NAME%-%PROJECT_VERSION%.dar

echo ==========================================
echo Canton DAML Deployment Script (Windows)
echo ==========================================
echo Participant URL: %PARTICIPANT_URL%
echo Project: %PROJECT_NAME% v%PROJECT_VERSION%
echo.

REM Step 1: Build DAML project
echo Step 1: Building DAML project...
where daml >nul 2>&1
if errorlevel 1 (
    echo ERROR: DAML SDK not found. Please install DAML SDK 2.8.0+
    echo Download from: https://github.com/digital-asset/daml/releases
    exit /b 1
)

daml version
daml build

if not exist "%DAR_FILE%" (
    echo ERROR: DAR file not found at %DAR_FILE%
    echo Build might have failed. Check the build output above.
    exit /b 1
)

echo DAR file built: %DAR_FILE%
echo.

REM Step 2: Upload DAR to Canton
echo Step 2: Uploading DAR to Canton participant...
echo Trying v2 packages endpoint...

curl -X POST "%PARTICIPANT_URL%/v2/packages" -H "Content-Type: application/octet-stream" --data-binary "@%DAR_FILE%" -w "\nHTTP Code: %%{http_code}\n"

if errorlevel 1 (
    echo ERROR: Upload failed. Check your network connection and participant URL.
    exit /b 1
)

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Verify the DAR was uploaded successfully (check HTTP response above)
echo 2. Initialize MarketConfig (if not already done)
echo 3. Test market creation from the frontend
echo.

