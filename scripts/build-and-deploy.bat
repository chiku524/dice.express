@echo off
REM Script to build DAML project and deploy to Canton
REM This uses cmd.exe which typically has the updated PATH

echo ==========================================
echo Building DAML Project
echo ==========================================
echo.

cd /d "%~dp0\.."
echo Current directory: %CD%
echo.

echo Checking DAML SDK...
daml version
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] DAML SDK not found. Please check installation.
    pause
    exit /b 1
)
echo.

echo Building DAML project...
daml build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo.

echo [OK] Build successful!
echo.

echo ==========================================
echo Deploying to Canton
echo ==========================================
echo.

call deploy-to-canton.bat

pause

