@echo off
REM Direct build and deploy script
REM Run this in Command Prompt or Windows Terminal

echo ==========================================
echo DAML Build and Deploy Script
echo ==========================================
echo.

cd /d "%~dp0\.."

echo Checking DAML SDK installation...
daml version
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: DAML SDK not found in PATH
    echo.
    echo Trying to find DAML SDK installation...
    
    REM Try common installation locations
    if exist "%LOCALAPPDATA%\daml-sdk\bin\daml.exe" (
        echo Found DAML SDK in: %LOCALAPPDATA%\daml-sdk\bin
        set "PATH=%LOCALAPPDATA%\daml-sdk\bin;%PATH%"
        daml version
        if %ERRORLEVEL% NEQ 0 (
            echo ERROR: Still cannot find DAML SDK
            pause
            exit /b 1
        )
    ) else (
        echo DAML SDK not found in common location: %LOCALAPPDATA%\daml-sdk\bin
        echo Please ensure DAML SDK is installed and in PATH
        pause
        exit /b 1
    )
)
echo.

echo Building DAML project...
daml build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)
echo.
echo [OK] Build successful!
echo.

echo ==========================================
echo Deploying to Canton
echo ==========================================
echo.

REM Check if DAR file exists
if not exist ".daml\dist\prediction-markets-1.0.0.dar" (
    echo ERROR: DAR file not found at .daml\dist\prediction-markets-1.0.0.dar
    echo Build may have failed or DAR file is in a different location.
    pause
    exit /b 1
)

echo Uploading DAR file to Canton...
curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages -H "Content-Type: application/octet-stream" --data-binary "@.daml\dist\prediction-markets-1.0.0.dar" -w "\nHTTP Status: %%{http_code}\n"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Upload failed!
    echo Please check your internet connection and Canton participant URL.
) else (
    echo.
    echo [OK] Deployment completed!
)

echo.
pause

