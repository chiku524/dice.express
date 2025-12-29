@echo off
REM Build DAML project only (skip SDK installation)

setlocal enabledelayedexpansion

set PROJECT_NAME=prediction-markets
set PROJECT_VERSION=1.0.0
set DAR_FILE=.daml\dist\%PROJECT_NAME%-%PROJECT_VERSION%.dar

echo ==========================================
echo Building DAML Project
echo ==========================================
echo.

REM Check if daml command is available
where daml >nul 2>&1
if errorlevel 1 (
    echo ERROR: DAML SDK not found. Please install DAML SDK first.
    pause
    exit /b 1
)

REM Check SDK version
echo Checking SDK version...
daml version
echo.

REM Build project
echo Building project...
daml build

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    echo Check the error messages above.
    echo.
    echo Common issues:
    echo   - "Lf1 is not supported": Packages are incompatible
    echo   - Missing dependencies: Check daml.yaml
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

