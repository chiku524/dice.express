@echo off
REM Verify quickstart-finance SDK version and get correct packages

setlocal enabledelayedexpansion

echo ==========================================
echo Verify and Fix Package LF Versions
echo ==========================================
echo.

REM Step 1: Check quickstart-finance-temp SDK version
echo Step 1: Checking quickstart-finance-temp SDK version...
cd ..\quickstart-finance-temp

if not exist "daml.yaml" (
    echo ERROR: quickstart-finance-temp\daml.yaml not found
    echo Please run: daml new quickstart-finance-temp --template=quickstart-finance
    cd ..\upwork-canton-daml-project
    pause
    exit /b 1
)

echo Checking daml.yaml in quickstart-finance-temp:
findstr /C:"sdk-version" daml.yaml
echo.

REM Step 2: If SDK version is not 3.4.9, update it
echo Step 2: Ensuring SDK 3.4.9 is configured...
findstr /C:"sdk-version: 3.4.9" daml.yaml >nul
if errorlevel 1 (
    echo WARNING: quickstart-finance-temp is not using SDK 3.4.9
    echo Updating daml.yaml to use SDK 3.4.9...
    
    REM Create backup
    copy daml.yaml daml.yaml.bak >nul
    
    REM Update SDK version (simple find/replace - may need manual edit)
    echo Please manually edit ..\quickstart-finance-temp\daml.yaml
    echo Change sdk-version to: 3.4.9
    echo Then run get-dependencies.bat again
    echo.
    echo Or delete quickstart-finance-temp and recreate with SDK 3.4.9 active
    cd ..\upwork-canton-daml-project
    pause
    exit /b 1
) else (
    echo SDK 3.4.9 is configured correctly
)

REM Step 3: Check if packages exist and their sizes
echo.
echo Step 3: Checking packages in quickstart-finance-temp...
if not exist ".lib" (
    echo ERROR: .lib directory not found
    echo Please run: get-dependencies.bat
    cd ..\upwork-canton-daml-project
    pause
    exit /b 1
)

echo Package sizes in quickstart-finance-temp:
for %%F in (.lib\daml-finance-interface-account.dar) do (
    for %%A in ("%%F") do (
        set SIZE=%%~zA
        set /a SIZEKB=!SIZE!/1024
        echo   daml-finance-interface-account.dar: !SIZEKB! KB
    )
)

REM Step 4: Clean build cache in project
echo.
echo Step 4: Cleaning build cache in project...
cd ..\upwork-canton-daml-project

if exist ".daml" (
    echo Removing .daml directory...
    rmdir /s /q .daml
    echo Build cache cleaned
) else (
    echo No .daml directory found (nothing to clean)
)

REM Step 5: Try building
echo.
echo Step 5: Attempting build...
daml build

if errorlevel 1 (
    echo.
    echo Build failed. The packages may still be LF version 1.
    echo.
    echo Next steps:
    echo   1. Check quickstart-finance-temp\daml.yaml has sdk-version: 3.4.9
    echo   2. Delete quickstart-finance-temp and recreate it with SDK 3.4.9 active
    echo   3. Run get-dependencies.bat in the new quickstart-finance-temp
    echo   4. Copy packages again
) else (
    echo.
    echo ==========================================
    echo Build Successful!
    echo ==========================================
)

pause

