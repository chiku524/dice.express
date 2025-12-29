@echo off
REM Install SDK 2.10.2 and build/deploy to Canton
REM This script handles SDK installation and deployment

setlocal enabledelayedexpansion

set PARTICIPANT_URL=%PARTICIPANT_URL%
if "%PARTICIPANT_URL%"=="" set PARTICIPANT_URL=https://participant.dev.canton.wolfedgelabs.com
set PROJECT_NAME=prediction-markets
set PROJECT_VERSION=1.0.0
set DAR_FILE=.daml\dist\%PROJECT_NAME%-%PROJECT_VERSION%.dar

echo ==========================================
echo Install SDK 2.10.2 ^& Deploy to Canton
echo ==========================================
echo.

REM Step 1: Check if daml command is available
echo Step 1: Checking DAML SDK...
where daml >nul 2>&1
if errorlevel 1 (
    echo ERROR: DAML SDK not found. Please install DAML SDK first.
    echo Download from: https://github.com/digital-asset/daml/releases
    pause
    exit /b 1
)

REM Step 2: Install SDK 2.10.2
echo.
echo Step 2: Installing SDK 2.10.2...
daml install 2.10.2
if errorlevel 1 (
    echo ERROR: Failed to install SDK 2.10.2
    pause
    exit /b 1
)

REM Step 3: Verify SDK version
echo.
echo Step 3: Verifying SDK version...
daml version
if errorlevel 1 (
    echo ERROR: Failed to get DAML version
    pause
    exit /b 1
)

REM Step 4: Build DAML project
echo.
echo Step 4: Building DAML project...
daml build

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    echo Check the error messages above.
    echo.
    echo Common issues:
    echo   - "Lf1 is not supported": Packages are incompatible
    echo   - Missing dependencies: Check daml.yaml
    echo   - Try getting packages via quickstart-finance template
    pause
    exit /b 1
)

if not exist "%DAR_FILE%" (
    echo.
    echo ERROR: DAR file not found at %DAR_FILE%
    echo Build might have failed. Check the build output above.
    pause
    exit /b 1
)

echo.
echo SUCCESS: DAR file built!
echo   Location: %DAR_FILE%
echo.

REM Step 5: Upload DAR to Canton
echo Step 5: Uploading DAR to Canton participant...
echo Trying v2 packages endpoint...

curl -X POST "%PARTICIPANT_URL%/v2/packages" -H "Content-Type: application/octet-stream" --data-binary "@%DAR_FILE%" -w "\nHTTP Code: %%{http_code}\n"

if errorlevel 1 (
    echo.
    echo v2 endpoint failed, trying v1 endpoint...
    curl -X POST "%PARTICIPANT_URL%/v1/packages" -H "Content-Type: application/octet-stream" --data-binary "@%DAR_FILE%" -w "\nHTTP Code: %%{http_code}\n"
    
    if errorlevel 1 (
        echo.
        echo ERROR: Upload failed!
        echo Check:
        echo   1. Network connection
        echo   2. Participant URL: %PARTICIPANT_URL%
        echo   3. Authentication (if required)
        pause
        exit /b 1
    ) else (
        echo.
        echo SUCCESS: DAR uploaded via v1 endpoint!
    )
) else (
    echo.
    echo SUCCESS: DAR uploaded via v2 endpoint!
)

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Next steps:
echo   1. Verify contracts are available on Canton
echo   2. Initialize MarketConfig (if not already done)
echo   3. Test market creation from the frontend
echo.
pause

