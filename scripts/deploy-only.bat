@echo off
REM Deploy DAR file to Canton (assumes build already completed)

setlocal enabledelayedexpansion

set PARTICIPANT_URL=%PARTICIPANT_URL%
if "%PARTICIPANT_URL%"=="" set PARTICIPANT_URL=https://participant.dev.canton.wolfedgelabs.com
set PROJECT_NAME=prediction-markets
set PROJECT_VERSION=1.0.0
set DAR_FILE=.daml\dist\%PROJECT_NAME%-%PROJECT_VERSION%.dar

echo ==========================================
echo Deploying to Canton
echo ==========================================
echo Participant URL: %PARTICIPANT_URL%
echo.

if not exist "%DAR_FILE%" (
    echo ERROR: DAR file not found at %DAR_FILE%
    echo Please build the project first:
    echo   Run: .\scripts\build-only.bat
    echo   Or: daml build
    pause
    exit /b 1
)

echo DAR file found: %DAR_FILE%
for %%A in ("%DAR_FILE%") do echo Size: %%~zA bytes
echo.

REM Upload DAR to Canton
echo Uploading to Canton participant...
echo Using v2/dars endpoint (as confirmed by client)...

curl -X POST "%PARTICIPANT_URL%/v2/dars" -H "Content-Type: application/octet-stream" --data-binary "@%DAR_FILE%" -w "\nHTTP Code: %%{http_code}\n"

if errorlevel 1 (
    echo.
    echo ERROR: Upload failed!
    echo Check:
    echo   1. Network connection
    echo   2. Participant URL: %PARTICIPANT_URL%
    echo   3. Authentication (if required)
    pause
    exit /b 1
) else (
    echo.
    echo ==========================================
    echo SUCCESS: DAR uploaded via v2/dars endpoint!
    echo ==========================================
)

echo.
echo Next steps:
echo   1. Verify contracts are available on Canton
echo   2. Initialize MarketConfig (if not already done)
echo   3. Test market creation from the frontend
echo.
pause

