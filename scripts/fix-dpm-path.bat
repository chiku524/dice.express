@echo off
REM Fix DPM PATH issue

echo ==========================================
echo Fixing DPM PATH
echo ==========================================
echo.

set DPM_DIR=C:\Users\chiku\AppData\Roaming\dpm

echo Checking DPM installation at: %DPM_DIR%
echo.

if not exist "%DPM_DIR%" (
    echo ERROR: DPM directory not found at %DPM_DIR%
    echo Please verify the installation path
    pause
    exit /b 1
)

echo Contents of DPM directory:
dir "%DPM_DIR%" /b
echo.

REM Check for dpm.exe or dpm.bat
if exist "%DPM_DIR%\dpm.exe" (
    echo Found: dpm.exe
    set DPM_EXE=%DPM_DIR%\dpm.exe
) else if exist "%DPM_DIR%\dpm.bat" (
    echo Found: dpm.bat
    set DPM_EXE=%DPM_DIR%\dpm.bat
) else if exist "%DPM_DIR%\bin\dpm.exe" (
    echo Found: bin\dpm.exe
    set DPM_DIR=%DPM_DIR%\bin
    set DPM_EXE=%DPM_DIR%\dpm.exe
) else (
    echo WARNING: dpm.exe or dpm.bat not found in %DPM_DIR%
    echo Please check the installation structure
    pause
    exit /b 1
)

echo.
echo DPM executable: %DPM_EXE%
echo.

REM Test if it works with full path
echo Testing DPM with full path...
"%DPM_EXE%" --version
if errorlevel 1 (
    echo ERROR: DPM executable doesn't work
    pause
    exit /b 1
)

echo.
echo DPM works with full path!
echo.

REM Add to PATH using proper method
echo Adding to PATH...
echo.

REM Get current PATH
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
    echo   2. Use full path: "%DPM_EXE%" --version
)

echo.
pause

