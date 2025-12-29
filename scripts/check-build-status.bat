@echo off
REM Check if build was successful

echo ==========================================
echo Checking Build Status
echo ==========================================
echo.

set DAR_FILE=.daml\dist\prediction-markets-1.0.0.dar

if exist "%DAR_FILE%" (
    echo SUCCESS: DAR file found!
    echo   Location: %DAR_FILE%
    for %%A in ("%DAR_FILE%") do echo   Size: %%~zA bytes
    echo.
    echo Next step: Deploy to Canton
    echo   Run: .\scripts\deploy-to-canton.bat
    echo   Or manually: curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages -H "Content-Type: application/octet-stream" --data-binary "@%DAR_FILE%"
) else (
    echo DAR file not found. Build may not have completed.
    echo.
    echo Next step: Build the project
    echo   Run: daml build
)

echo.
pause

