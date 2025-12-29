@echo off
REM Try building with DPM instead of daml build

echo ==========================================
echo Building with DPM (Digital Asset Package Manager)
echo ==========================================
echo.

REM Check if dpm is available
where dpm >nul 2>&1
if errorlevel 1 (
    echo ERROR: DPM not found
    echo DPM should be installed with SDK 3.4.9
    echo.
    echo Try: dpm --version
    pause
    exit /b 1
)

echo DPM found, checking version...
dpm --version
echo.

echo Attempting build with DPM...
dpm build

if errorlevel 1 (
    echo.
    echo DPM build failed. Check error messages above.
    echo.
    echo If DPM also fails, the packages may still be incompatible.
    echo We may need to wait for DAML support response or try
    echo a different approach.
) else (
    echo.
    echo ==========================================
    echo Build Successful with DPM!
    echo ==========================================
    echo.
    echo Next step: Deploy to Canton
    echo   Run: .\scripts\deploy-only.bat
)

pause

