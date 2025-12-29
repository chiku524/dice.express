@echo off
REM Verify DPM installation and PATH

echo ==========================================
echo Verifying DPM Installation
echo ==========================================
echo.

REM Check if dpm is in PATH
where dpm >nul 2>&1
if errorlevel 1 (
    echo DPM not found in PATH
    echo.
    echo Common DPM installation locations:
    echo   %LOCALAPPDATA%\Programs\dpm
    echo   %APPDATA%\dpm
    echo   %USERPROFILE%\.dpm
    echo   C:\Program Files\dpm
    echo.
    
    echo Checking common locations...
    if exist "%LOCALAPPDATA%\Programs\dpm" (
        echo Found: %LOCALAPPDATA%\Programs\dpm
        echo.
        echo To add to PATH, run:
        echo   setx PATH "%PATH%;%LOCALAPPDATA%\Programs\dpm"
        echo   Then restart your terminal
    )
    
    if exist "%APPDATA%\dpm" (
        echo Found: %APPDATA%\dpm
    )
    
    if exist "%USERPROFILE%\.dpm" (
        echo Found: %USERPROFILE%\.dpm
    )
    
    if exist "C:\Program Files\dpm" (
        echo Found: C:\Program Files\dpm
    )
    
    echo.
    echo If DPM is installed but not in PATH:
    echo   1. Find the DPM installation directory
    echo   2. Add it to your system PATH
    echo   3. Restart your terminal
    echo.
    echo Or use full path to DPM executable
) else (
    echo DPM found in PATH!
    dpm --version
)

echo.
pause

