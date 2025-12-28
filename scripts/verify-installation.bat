@echo off
REM Script to verify DAML SDK and Java installation

echo ==========================================
echo Verifying Installation
echo ==========================================
echo.

echo Checking Java installation...
java -version 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Java is not in PATH
    echo Please restart your terminal or check Java installation
) else (
    echo [OK] Java is installed
)
echo.

echo Checking DAML SDK installation...
daml version 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] DAML SDK is not in PATH
    echo Please restart your terminal or check DAML SDK installation
) else (
    echo [OK] DAML SDK is installed
)
echo.

echo ==========================================
echo Next Steps
echo ==========================================
echo If both checks passed:
echo   1. Run: daml build
echo   2. Run: scripts\deploy-to-canton.bat
echo.
echo If checks failed:
echo   - Close and restart your terminal
echo   - Or check installation paths manually
echo.

pause

