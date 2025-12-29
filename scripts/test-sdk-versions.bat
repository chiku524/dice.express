@echo off
REM Test different SDK versions with current packages

echo ==========================================
echo Testing Different SDK Versions
echo ==========================================
echo.

set SDK_VERSIONS=2.8.0 2.10.0 2.10.2 3.4.9

for %%S in (%SDK_VERSIONS%) do (
    echo.
    echo ==========================================
    echo Testing SDK %%S
    echo ==========================================
    echo.
    
    echo Installing SDK %%S...
    daml install %%S
    
    echo.
    echo Verifying SDK version...
    daml version
    
    echo.
    echo Attempting build...
    dpm build
    
    if errorlevel 1 (
        echo.
        echo Build failed with SDK %%S
    ) else (
        echo.
        echo ==========================================
        echo SUCCESS with SDK %%S!
        echo ==========================================
        echo.
        pause
        exit /b 0
    )
    
    echo.
    echo ------------------------------------------
)

echo.
echo All SDK versions tested. None succeeded.
pause

