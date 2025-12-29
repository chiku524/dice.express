@echo off
REM Build main project with --target=2.1

echo ==========================================
echo Building Main Project
echo ==========================================
echo.

REM Add dpm to PATH for this session if not already there
set DPM_PATH=%USERPROFILE%\AppData\Roaming\dpm\cache\components\dpm\1.0.4
set PATH=%PATH%;%DPM_PATH%

REM Check if dpm is available
where dpm >nul 2>&1
if errorlevel 1 (
    echo WARNING: dpm not in PATH, using full path: %DPM_PATH%\dpm.exe
    set DPM_CMD=%DPM_PATH%\dpm.exe
) else (
    set DPM_CMD=dpm
)

echo Using: %DPM_CMD%
echo.

REM Build
echo Building with --target=2.1...
echo.

%DPM_CMD% build

if errorlevel 1 (
    echo.
    echo ==========================================
    echo Build failed
    echo ==========================================
    echo.
    echo Check the error message above.
    pause
    exit /b 1
) else (
    echo.
    echo ==========================================
    echo Build successful!
    echo ==========================================
    echo.
    echo DAR file: .daml\dist\prediction-markets-1.0.0.dar
    echo.
)

pause

