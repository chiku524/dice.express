@echo off
REM Fix DPM PATH - point to correct directory with dpm.exe

setlocal enabledelayedexpansion

echo ==========================================
echo Fixing DPM PATH
echo ==========================================
echo.

REM Correct DPM path (where dpm.exe actually is)
set DPM_DIR=C:\Users\chiku\AppData\Roaming\dpm\cache\components\dpm\1.0.4

echo DPM executable location: %DPM_DIR%\dpm.exe
echo.

REM Verify dpm.exe exists
if not exist "%DPM_DIR%\dpm.exe" (
    echo ERROR: dpm.exe not found at %DPM_DIR%\dpm.exe
    echo.
    echo Searching for dpm.exe...
    dir "%APPDATA%\dpm" /s /b | findstr /i "dpm.exe"
    pause
    exit /b 1
)

echo Found dpm.exe!
echo.

REM Test if it works with full path
echo Testing DPM with full path...
"%DPM_DIR%\dpm.exe" --version
if errorlevel 1 (
    echo ERROR: DPM executable doesn't work
    pause
    exit /b 1
)

echo.
echo DPM works with full path!
echo.

REM Get current PATH from registry
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "CURRENT_PATH=%%B"

REM Check if already in PATH
echo %CURRENT_PATH% | findstr /C:"%DPM_DIR%" >nul
if errorlevel 1 (
    echo Adding %DPM_DIR% to PATH...
    
    REM Use reg to add to PATH (more reliable than setx)
    reg add "HKCU\Environment" /v PATH /t REG_EXPAND_SZ /d "%CURRENT_PATH%;%DPM_DIR%" /f >nul 2>&1
    
    if errorlevel 1 (
        echo ERROR: Failed to add to PATH via registry
        echo.
        echo Manual steps:
        echo   1. Press Win+R
        echo   2. Type: sysdm.cpl
        echo   3. Go to Advanced tab
        echo   4. Click Environment Variables
        echo   5. Edit User PATH variable
        echo   6. Add: %DPM_DIR%
        echo   7. Click OK on all dialogs
        echo   8. Restart terminal
        pause
        exit /b 1
    ) else (
        echo SUCCESS: Added to PATH via registry
        echo.
        echo IMPORTANT: You must restart your terminal for changes to take effect
        echo.
        echo After restarting, test with:
        echo   dpm --version
    )
) else (
    echo DPM directory is already in PATH
    echo.
    echo If it still doesn't work, try:
    echo   1. Restart terminal
    echo   2. Use full path: "%DPM_DIR%\dpm.exe" --version
)

echo.
echo ==========================================
echo Next Steps
echo ==========================================
echo.
echo 1. Close this terminal completely
echo 2. Open a NEW terminal
echo 3. Test: dpm --version
echo 4. If it works, try: dpm build
echo.
pause

