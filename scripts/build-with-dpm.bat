@echo off
REM Build script using DPM

echo ========================================
echo Building with DPM
echo ========================================
echo.

echo Step 1: Verifying DPM...
dpm --version
if %errorlevel% neq 0 (
    echo ERROR: DPM not found. Please ensure DPM is in your PATH.
    pause
    exit /b 1
)

echo.
echo Step 2: Cleaning old build artifacts...
if exist .daml rmdir /s /q .daml
echo Cleaned .daml directory

echo.
echo Step 3: Building with DPM...
dpm build
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Build successful!
    echo ========================================
    echo.
    echo DAR file should be at: .daml\dist\prediction-markets-1.0.0.dar
) else (
    echo.
    echo ========================================
    echo Build failed!
    echo ========================================
    echo.
    echo If you see "Lf1 is not supported" error:
    echo 1. Try removing .lib directory: rmdir /s /q .lib
    echo 2. Try: daml build (instead of dpm build)
    echo 3. Check DPM documentation for dependency resolution
)

pause

