@echo off
REM Run test script to verify DAML code works locally

echo ==========================================
echo Running Test Script Locally
echo ==========================================
echo.

REM Create temporary directory for test
set TEST_DIR=test-contract
if not exist %TEST_DIR% (
    echo ERROR: Test contract not built. Run test-contract-build.bat first.
    pause
    exit /b 1
)

cd %TEST_DIR%

echo Building with script support...
dpm build

if errorlevel 1 (
    echo ERROR: Build failed
    cd ..
    pause
    exit /b 1
)

echo.
echo Running test script...
echo Note: This requires a DAML ledger to be running.
echo For local testing, you can use 'daml start' or 'daml sandbox'
echo.

REM Try to run the script
REM Note: This requires a running ledger
dpm run daml/TestScript.daml

if errorlevel 1 (
    echo.
    echo NOTE: Script execution requires a running DAML ledger.
    echo To test locally:
    echo   1. Start a ledger: daml start
    echo   2. Or use: daml sandbox
    echo   3. Then run: dpm run daml/TestScript.daml
)

cd ..

echo.
pause

