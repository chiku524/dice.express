@echo off
REM Force clean build cache - handles locked files and long paths

echo ==========================================
echo Force Cleaning Build Cache
echo ==========================================
echo.

REM Method 1: Try normal deletion first
if exist ".daml" (
    echo Attempting to remove .daml directory...
    rmdir /s /q .daml 2>nul
    timeout /t 1 >nul
)

REM Method 2: If still exists, try with different approach
if exist ".daml" (
    echo Normal deletion failed, trying alternative method...
    
    REM Try removing subdirectories first
    if exist ".daml\dependencies" (
        echo Removing dependencies subdirectory...
        rmdir /s /q ".daml\dependencies" 2>nul
    )
    
    if exist ".daml\dist" (
        echo Removing dist subdirectory...
        rmdir /s /q ".daml\dist" 2>nul
    )
    
    REM Try removing .daml again
    rmdir /s /q .daml 2>nul
    timeout /t 1 >nul
)

REM Method 3: Check if still exists
if exist ".daml" (
    echo.
    echo WARNING: Could not fully remove .daml directory
    echo Some files may be locked or paths too long
    echo.
    echo You may need to:
    echo   1. Close any DAML processes
    echo   2. Restart your terminal
    echo   3. Manually delete .daml folder in File Explorer
    echo.
) else (
    echo.
    echo SUCCESS: Build cache cleaned!
    echo.
)

REM Also check for other cache locations
echo Checking for other cache locations...
if exist "%APPDATA%\daml\cache" (
    echo Found: %APPDATA%\daml\cache
    echo You may want to clean this too: rmdir /s /q "%APPDATA%\daml\cache"
)

if exist "%USERPROFILE%\.daml\cache" (
    echo Found: %USERPROFILE%\.daml\cache
    echo You may want to clean this too: rmdir /s /q "%USERPROFILE%\.daml\cache"
)

echo.
echo Next step: Rebuild with SDK 3.4.9
echo   Run: daml build
echo.
pause

