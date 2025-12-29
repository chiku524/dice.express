@echo off
REM Test build with --target=2.1 build option

echo ==========================================
echo Testing Build with --target=2.1
echo ==========================================
echo.

echo Building main project with LF target 2.1...
echo.

REM Use dpm if available, otherwise daml
where dpm >nul 2>&1
if errorlevel 1 (
    echo Using daml build...
    daml build
) else (
    echo Using dpm build...
    dpm build
)

if errorlevel 1 (
    echo.
    echo ==========================================
    echo Build failed
    echo ==========================================
    echo.
    echo Check the error message above.
    echo The --target=2.1 option might help with LF parser errors.
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ==========================================
    echo Build successful!
    echo ==========================================
    echo.
    echo DAR file should be at: .daml\dist\prediction-markets-1.0.0.dar
    echo.
)

pause

