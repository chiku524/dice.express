@echo off
echo ========================================
echo DPM Installation Verification
echo ========================================
echo.

echo Step 1: Checking if DPM is in PATH...
dpm --version 2>nul
if %errorlevel% equ 0 (
    echo [SUCCESS] DPM is installed and accessible!
    echo.
    dpm --version
    goto :end
)

echo [NOT FOUND] DPM not in PATH. Checking common installation locations...
echo.

set "LOCAL_DAML=%LOCALAPPDATA%\daml\bin"
set "ROAMING_DAML=%APPDATA%\daml\bin"

if exist "%LOCAL_DAML%\dpm.exe" (
    echo [FOUND] DPM at: %LOCAL_DAML%\dpm.exe
    "%LOCAL_DAML%\dpm.exe" --version
    echo.
    echo To use DPM, add to PATH:
    echo   setx PATH "%%PATH%%;%LOCAL_DAML%"
    echo   (Then restart terminal)
    goto :found
)

if exist "%LOCAL_DAML%\dpm.cmd" (
    echo [FOUND] DPM at: %LOCAL_DAML%\dpm.cmd
    "%LOCAL_DAML%\dpm.cmd" --version
    echo.
    echo To use DPM, add to PATH:
    echo   setx PATH "%%PATH%%;%LOCAL_DAML%"
    echo   (Then restart terminal)
    goto :found
)

if exist "%ROAMING_DAML%\dpm.exe" (
    echo [FOUND] DPM at: %ROAMING_DAML%\dpm.exe
    "%ROAMING_DAML%\dpm.exe" --version
    echo.
    echo To use DPM, add to PATH:
    echo   setx PATH "%%PATH%%;%ROAMING_DAML%"
    echo   (Then restart terminal)
    goto :found
)

echo [NOT FOUND] DPM not found in common locations.
echo.
echo Please try:
echo 1. Restart your terminal/command prompt
echo 2. Run this script again
echo 3. If still not found, DPM may need to be reinstalled
goto :end

:found
echo.
echo ========================================
echo DPM is installed! Next steps:
echo ========================================
echo 1. If DPM was not in PATH, add it (see command above)
echo 2. Restart your terminal
echo 3. Navigate to your project: cd %CD%
echo 4. Run: daml build
echo.

:end
pause

