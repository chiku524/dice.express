@echo off
REM Get LF 1.17 compatible packages for SDK 3.4.9
REM Creates quickstart-finance project outside current directory and copies packages

setlocal enabledelayedexpansion

echo ==========================================
echo Getting LF 1.17 Packages for SDK 3.4.9
echo ==========================================
echo.

REM Step 1: Create quickstart-finance project in parent directory
echo Step 1: Creating quickstart-finance project...
cd ..

if exist "quickstart-finance-temp" (
    echo Removing existing quickstart-finance-temp directory...
    rmdir /s /q quickstart-finance-temp
)

daml new quickstart-finance-temp --template=quickstart-finance
if errorlevel 1 (
    echo ERROR: Failed to create quickstart-finance project
    cd upwork-canton-daml-project
    pause
    exit /b 1
)

REM Step 2: Download dependencies
echo.
echo Step 2: Downloading dependencies...
cd quickstart-finance-temp

REM Check if get-dependencies.bat exists
if exist "get-dependencies.bat" (
    call get-dependencies.bat
) else if exist "get-dependencies.sh" (
    echo Using get-dependencies.sh (may need Git Bash)
    bash get-dependencies.sh
) else (
    echo WARNING: get-dependencies script not found
    echo Trying to download manually...
)

if errorlevel 1 (
    echo ERROR: Failed to download dependencies
    cd ..\upwork-canton-daml-project
    pause
    exit /b 1
)

REM Step 3: Check if .lib directory exists and has packages
if not exist ".lib" (
    echo ERROR: .lib directory not found after downloading dependencies
    cd ..\upwork-canton-daml-project
    pause
    exit /b 1
)

echo.
echo Step 3: Copying packages to project...
cd ..\upwork-canton-daml-project

REM Create .lib directory if it doesn't exist
if not exist ".lib" (
    mkdir .lib
)

REM Copy interface packages we need
echo Copying interface packages...
copy "..\quickstart-finance-temp\.lib\daml-finance-interface-account.dar" ".lib\" >nul 2>&1
copy "..\quickstart-finance-temp\.lib\daml-finance-interface-holding.dar" ".lib\" >nul 2>&1
copy "..\quickstart-finance-temp\.lib\daml-finance-interface-settlement.dar" ".lib\" >nul 2>&1
copy "..\quickstart-finance-temp\.lib\daml-finance-interface-types-common.dar" ".lib\" >nul 2>&1
copy "..\quickstart-finance-temp\.lib\daml-finance-interface-instrument-token.dar" ".lib\" >nul 2>&1
copy "..\quickstart-finance-temp\.lib\daml-finance-interface-util.dar" ".lib\" >nul 2>&1

REM Verify files were copied
echo.
echo Verifying packages...
set MISSING=0
if not exist ".lib\daml-finance-interface-account.dar" (
    echo ERROR: daml-finance-interface-account.dar not copied
    set MISSING=1
)
if not exist ".lib\daml-finance-interface-holding.dar" (
    echo ERROR: daml-finance-interface-holding.dar not copied
    set MISSING=1
)
if not exist ".lib\daml-finance-interface-settlement.dar" (
    echo ERROR: daml-finance-interface-settlement.dar not copied
    set MISSING=1
)
if not exist ".lib\daml-finance-interface-types-common.dar" (
    echo ERROR: daml-finance-interface-types-common.dar not copied
    set MISSING=1
)
if not exist ".lib\daml-finance-interface-instrument-token.dar" (
    echo ERROR: daml-finance-interface-instrument-token.dar not copied
    set MISSING=1
)
if not exist ".lib\daml-finance-interface-util.dar" (
    echo ERROR: daml-finance-interface-util.dar not copied
    set MISSING=1
)

if !MISSING! EQU 1 (
    echo.
    echo ERROR: Some packages were not copied successfully
    pause
    exit /b 1
)

REM Show file sizes
echo.
echo Package sizes:
for %%F in (.lib\*.dar) do (
    for %%A in ("%%F") do (
        set SIZE=%%~zA
        set /a SIZEKB=!SIZE!/1024
        echo   %%~nxF: !SIZEKB! KB
    )
)

echo.
echo ==========================================
echo Packages copied successfully!
echo ==========================================
echo.
echo Next steps:
echo   1. Run: daml build
echo   2. If successful, deploy: .\scripts\deploy-only.bat
echo.

REM Clean up (optional - comment out if you want to keep the temp project)
echo Cleaning up temporary project...
cd ..
if exist "quickstart-finance-temp" (
    rmdir /s /q quickstart-finance-temp
)

cd upwork-canton-daml-project
pause

