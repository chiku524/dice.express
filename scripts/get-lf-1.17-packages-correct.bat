@echo off
REM Get LF 1.17 compatible packages for SDK 3.4.9
REM Creates quickstart-finance-temp in PARENT directory (outside project)

setlocal enabledelayedexpansion

REM Store current directory
set CURRENT_DIR=%CD%

echo ==========================================
echo Getting LF 1.17 Packages for SDK 3.4.9
echo ==========================================
echo Current directory: %CURRENT_DIR%
echo.

REM Step 1: Go to parent directory
echo Step 1: Navigating to parent directory...
cd ..

REM Verify we're in the right place
echo Current directory: %CD%
echo.

REM Step 2: Remove existing quickstart-finance-temp if it exists
if exist "quickstart-finance-temp" (
    echo Removing existing quickstart-finance-temp directory...
    rmdir /s /q quickstart-finance-temp
)

REM Step 3: Create quickstart-finance project
echo Step 2: Creating quickstart-finance project...
daml new quickstart-finance-temp --template=quickstart-finance
if errorlevel 1 (
    echo ERROR: Failed to create quickstart-finance project
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
)

echo SUCCESS: quickstart-finance-temp created in: %CD%
echo.

REM Step 4: Navigate to quickstart-finance-temp
echo Step 3: Navigating to quickstart-finance-temp...
cd quickstart-finance-temp

REM Verify we're in quickstart-finance-temp
echo Current directory: %CD%
echo.

REM Step 5: Check daml.yaml to verify SDK version
echo Step 4: Verifying SDK version in daml.yaml...
if exist "daml.yaml" (
    findstr /C:"sdk-version" daml.yaml
) else (
    echo WARNING: daml.yaml not found
)
echo.

REM Step 6: Download dependencies
echo Step 5: Downloading dependencies...
if exist "get-dependencies.bat" (
    echo Found get-dependencies.bat, running it...
    call get-dependencies.bat
    if errorlevel 1 (
        echo ERROR: get-dependencies.bat failed
        cd "%CURRENT_DIR%"
        pause
        exit /b 1
    )
) else if exist "get-dependencies.sh" (
    echo WARNING: Only get-dependencies.sh found (needs Git Bash)
    echo Please run manually: bash get-dependencies.sh
    echo Then continue with copying packages manually
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
) else (
    echo ERROR: get-dependencies script not found
    echo Available files:
    dir /b
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
)

REM Step 7: Verify .lib directory exists
echo.
echo Step 6: Verifying packages were downloaded...
if not exist ".lib" (
    echo ERROR: .lib directory not found after downloading dependencies
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
)

echo Checking downloaded packages...
dir .lib\daml-finance-interface-*.dar
if errorlevel 1 (
    echo ERROR: No daml-finance-interface packages found in .lib
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
)
echo.

REM Step 8: Copy packages to project
echo Step 7: Copying packages to project...
echo Source: %CD%\.lib\
echo Destination: %CURRENT_DIR%\.lib\

REM Go back to parent directory first
cd ..

REM Create .lib directory in project if it doesn't exist
if not exist "%CURRENT_DIR%\.lib" (
    echo Creating .lib directory in project...
    mkdir "%CURRENT_DIR%\.lib"
)

REM Copy each package with full paths
echo.
echo Copying packages...
copy "quickstart-finance-temp\.lib\daml-finance-interface-account.dar" "%CURRENT_DIR%\.lib\" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to copy daml-finance-interface-account.dar
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
) else (
    echo   [OK] daml-finance-interface-account.dar
)

copy "quickstart-finance-temp\.lib\daml-finance-interface-holding.dar" "%CURRENT_DIR%\.lib\" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to copy daml-finance-interface-holding.dar
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
) else (
    echo   [OK] daml-finance-interface-holding.dar
)

copy "quickstart-finance-temp\.lib\daml-finance-interface-settlement.dar" "%CURRENT_DIR%\.lib\" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to copy daml-finance-interface-settlement.dar
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
) else (
    echo   [OK] daml-finance-interface-settlement.dar
)

copy "quickstart-finance-temp\.lib\daml-finance-interface-types-common.dar" "%CURRENT_DIR%\.lib\" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to copy daml-finance-interface-types-common.dar
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
) else (
    echo   [OK] daml-finance-interface-types-common.dar
)

copy "quickstart-finance-temp\.lib\daml-finance-interface-instrument-token.dar" "%CURRENT_DIR%\.lib\" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to copy daml-finance-interface-token.dar
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
) else (
    echo   [OK] daml-finance-interface-instrument-token.dar
)

copy "quickstart-finance-temp\.lib\daml-finance-interface-util.dar" "%CURRENT_DIR%\.lib\" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to copy daml-finance-interface-util.dar
    cd "%CURRENT_DIR%"
    pause
    exit /b 1
) else (
    echo   [OK] daml-finance-interface-util.dar
)

REM Step 9: Verify packages were copied
echo.
echo Step 8: Verifying packages in project...
cd "%CURRENT_DIR%"

set MISSING=0
if not exist ".lib\daml-finance-interface-account.dar" (
    echo ERROR: daml-finance-interface-account.dar not found
    set MISSING=1
)
if not exist ".lib\daml-finance-interface-holding.dar" (
    echo ERROR: daml-finance-interface-holding.dar not found
    set MISSING=1
)
if not exist ".lib\daml-finance-interface-settlement.dar" (
    echo ERROR: daml-finance-interface-settlement.dar not found
    set MISSING=1
)
if not exist ".lib\daml-finance-interface-types-common.dar" (
    echo ERROR: daml-finance-interface-types-common.dar not found
    set MISSING=1
)
if not exist ".lib\daml-finance-interface-instrument-token.dar" (
    echo ERROR: daml-finance-interface-instrument-token.dar not found
    set MISSING=1
)
if not exist ".lib\daml-finance-interface-util.dar" (
    echo ERROR: daml-finance-interface-util.dar not found
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
echo Package sizes (new packages):
for %%F in (.lib\daml-finance-interface-*.dar) do (
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

REM Step 10: Clean up
echo Step 9: Cleaning up temporary project...
cd ..
if exist "quickstart-finance-temp" (
    rmdir /s /q quickstart-finance-temp
    echo Temporary project removed
)

cd "%CURRENT_DIR%"

echo.
echo Next steps:
echo   1. Run: daml build
echo   2. If successful, deploy: .\scripts\deploy-only.bat
echo.
pause

