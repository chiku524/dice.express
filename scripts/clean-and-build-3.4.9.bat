@echo off
REM Clean build caches and build with SDK 3.4.9

setlocal enabledelayedexpansion

set PROJECT_NAME=prediction-markets
set PROJECT_VERSION=1.0.0
set DAR_FILE=.daml\dist\%PROJECT_NAME%-%PROJECT_VERSION%.dar

echo ==========================================
echo Clean Build with SDK 3.4.9
echo ==========================================
echo.

REM Step 1: Check if daml command is available
where daml >nul 2>&1
if errorlevel 1 (
    echo ERROR: DAML SDK not found. Please install DAML SDK first.
    pause
    exit /b 1
)

REM Step 2: Install SDK 3.4.9
echo Step 1: Installing SDK 3.4.9...
daml install 3.4.9
if errorlevel 1 (
    echo ERROR: Failed to install SDK 3.4.9
    pause
    exit /b 1
)

REM Step 3: Verify SDK version
echo.
echo Step 2: Verifying SDK version...
daml version
echo.

REM Step 4: Clean build artifacts
echo Step 3: Cleaning build artifacts...
if exist ".daml" (
    echo Removing .daml directory...
    rmdir /s /q .daml
)

REM Step 5: Build project
echo.
echo Step 4: Building DAML project with SDK 3.4.9...
daml build

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    echo Check the error messages above.
    echo.
    echo If you see "Lf1 is not supported", try:
    echo   1. Check if packages in .lib are correct
    echo   2. Try downloading packages again
    echo   3. Check daml.yaml configuration
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
echo ==========================================
echo Build Successful!
echo ==========================================
echo.
echo DAR file created: %DAR_FILE%
for %%A in ("%DAR_FILE%") do echo Size: %%~zA bytes
echo.
echo Next step: Deploy to Canton
echo   Run: .\scripts\deploy-only.bat
echo.
pause

