@echo off
REM Build and test a simple contract without DA.Finance dependencies

echo ==========================================
echo Testing Simple Contract Build
echo ==========================================
echo.

REM Create temporary directory for test
set TEST_DIR=test-contract
if exist %TEST_DIR% rmdir /s /q %TEST_DIR%
mkdir %TEST_DIR%
mkdir %TEST_DIR%\daml

echo Copying test contract...
copy daml\TestContract.daml %TEST_DIR%\daml\
copy daml\TestScript.daml %TEST_DIR%\daml\

echo Creating test daml.yaml...
copy daml.yaml.test %TEST_DIR%\daml.yaml

cd %TEST_DIR%

echo.
echo Building test contract...
dpm build

if errorlevel 1 (
    echo.
    echo ERROR: Build failed
    cd ..
    pause
    exit /b 1
)

echo.
echo SUCCESS: Test contract built successfully!
echo.

echo Checking for DAR file...
if exist .daml\dist\prediction-markets-test-1.0.0.dar (
    echo Found DAR file: .daml\dist\prediction-markets-test-1.0.0.dar
    echo.
    echo Test contract build works! SDK is functioning correctly.
) else (
    echo WARNING: DAR file not found in expected location
    dir .daml\dist /s /b
)

cd ..

echo.
echo ==========================================
echo Test Complete
echo ==========================================
echo.
pause

