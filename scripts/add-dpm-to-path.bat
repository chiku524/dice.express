@echo off
REM Permanently add dpm to PATH

echo ==========================================
echo Adding dpm to PATH Permanently
echo ==========================================
echo.

REM Find dpm.exe
set DPM_PATH=

if exist "%USERPROFILE%\AppData\Roaming\dpm\cache\components\dpm\1.0.4\dpm.exe" (
    set DPM_PATH=%USERPROFILE%\AppData\Roaming\dpm\cache\components\dpm\1.0.4
    echo [FOUND] %DPM_PATH%\dpm.exe
)

if "%DPM_PATH%"=="" (
    echo ERROR: dpm.exe not found in expected location
    echo.
    echo Expected: %USERPROFILE%\AppData\Roaming\dpm\cache\components\dpm\1.0.4\dpm.exe
    echo.
    echo Please run the PowerShell script for deeper search:
    echo   powershell -ExecutionPolicy Bypass -File scripts\add-dpm-to-path-permanent.ps1
    pause
    exit /b 1
)

echo.
echo dpm.exe location: %DPM_PATH%
echo.

REM Test dpm
echo Testing dpm...
"%DPM_PATH%\dpm.exe" --version
if errorlevel 1 (
    echo WARNING: dpm.exe found but doesn't work
)

echo.
echo ==========================================
echo Adding to User PATH...
echo ==========================================
echo.

REM Get current PATH
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set CURRENT_PATH=%%B

REM Check if already in PATH
echo %CURRENT_PATH% | findstr /C:"%DPM_PATH%" >nul
if not errorlevel 1 (
    echo PATH already contains: %DPM_PATH%
    echo.
    echo Current PATH includes this location.
) else (
    REM Add to PATH
    setx PATH "%CURRENT_PATH%;%DPM_PATH%"
    if errorlevel 1 (
        echo ERROR: Could not update PATH
        echo.
        echo Trying with PowerShell method...
        powershell -Command "[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';%DPM_PATH%', 'User')"
    ) else (
        echo Added to User PATH: %DPM_PATH%
        echo.
        echo PATH updated successfully!
    )
)

REM Add to current session
set PATH=%PATH%;%DPM_PATH%

echo.
echo ==========================================
echo Verifying dpm command...
echo ==========================================
echo.

REM Test if dpm is now available
where dpm >nul 2>&1
if errorlevel 1 (
    echo.
    echo dpm command not yet recognized in this session.
    echo Please restart your terminal, or use the full path: %DPM_PATH%\dpm.exe
    echo.
    echo The PATH has been updated permanently, so it will work in new terminals.
) else (
    echo SUCCESS! dpm is now available:
    dpm --version
    echo.
    echo You may need to restart your terminal for the change to take full effect.
)

echo.
pause

