@echo off
REM Switch to SDK 2.10.2 and test build with DA.Finance packages

echo ========================================
echo Switching to DAML SDK 2.10.2
echo ========================================
echo.

echo Step 1: Installing SDK 2.10.2...
daml install 2.10.2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install SDK 2.10.2
    echo Please run this in a terminal where 'daml' command is available
    pause
    exit /b 1
)

echo.
echo Step 2: Verifying SDK version...
daml version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to verify SDK version
    pause
    exit /b 1
)

echo.
echo Step 3: Building project with SDK 2.10.2...
daml build
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Build completed successfully!
    echo ========================================
    echo.
    echo The DAR file should be at: .daml\dist\prediction-markets-1.0.0.dar
) else (
    echo.
    echo ========================================
    echo BUILD FAILED
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo If you see "Lf1 is not supported", the packages may still be incompatible.
    echo If you see other errors, they may be code compatibility issues.
)

echo.
pause

