@echo off
REM Find grpcurl.exe on the system and help set up PATH

echo ==========================================
echo Searching for grpcurl.exe...
echo ==========================================
echo.

REM Check common Go locations
set FOUND=0

if exist "%USERPROFILE%\go\bin\grpcurl.exe" (
    echo [FOUND] %USERPROFILE%\go\bin\grpcurl.exe
    set GRPCURL_PATH=%USERPROFILE%\go\bin
    set FOUND=1
)

if exist "%LOCALAPPDATA%\go\bin\grpcurl.exe" (
    echo [FOUND] %LOCALAPPDATA%\go\bin\grpcurl.exe
    set GRPCURL_PATH=%LOCALAPPDATA%\go\bin
    set FOUND=1
)

if exist "%GOPATH%\bin\grpcurl.exe" (
    echo [FOUND] %GOPATH%\bin\grpcurl.exe
    set GRPCURL_PATH=%GOPATH%\bin
    set FOUND=1
)

REM Check Downloads folder
if exist "%USERPROFILE%\Downloads\grpcurl.exe" (
    echo [FOUND] %USERPROFILE%\Downloads\grpcurl.exe
    set GRPCURL_PATH=%USERPROFILE%\Downloads
    set FOUND=1
)

REM Check Desktop
if exist "%USERPROFILE%\Desktop\grpcurl.exe" (
    echo [FOUND] %USERPROFILE%\Desktop\grpcurl.exe
    set GRPCURL_PATH=%USERPROFILE%\Desktop
    set FOUND=1
)

REM Check current directory
if exist "grpcurl.exe" (
    echo [FOUND] %CD%\grpcurl.exe
    set GRPCURL_PATH=%CD%
    set FOUND=1
)

REM Use PowerShell for deeper search
echo.
echo Searching with PowerShell...
powershell -Command "Get-ChildItem -Path $env:USERPROFILE -Filter grpcurl.exe -Recurse -ErrorAction SilentlyContinue -Depth 3 | Select-Object -First 5 FullName | ForEach-Object { Write-Output \"[FOUND] $_\" }"

if %FOUND%==0 (
    echo.
    echo grpcurl.exe not found in common locations.
    echo.
    echo Please:
    echo   1. Find where you downloaded/extracted grpcurl.exe
    echo   2. Note the full path
    echo   3. We'll add it to PATH
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Found grpcurl.exe!
echo ==========================================
echo.
echo Location: %GRPCURL_PATH%
echo.

REM Verify it works
"%GRPCURL_PATH%\grpcurl.exe" --version
if errorlevel 1 (
    echo ERROR: grpcurl.exe found but doesn't work
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Adding to PATH...
echo ==========================================
echo.

REM Add to PATH for current session
set PATH=%PATH%;%GRPCURL_PATH%

echo Added to PATH for this session: %GRPCURL_PATH%
echo.

REM Add to system PATH permanently
echo Do you want to add this to your system PATH permanently? (Y/N)
set /p ADD_TO_PATH=

if /i "%ADD_TO_PATH%"=="Y" (
    echo.
    echo Adding to system PATH...
    setx PATH "%PATH%;%GRPCURL_PATH%" /M
    if errorlevel 1 (
        echo.
        echo Could not add to system PATH (may need admin rights).
        echo Adding to user PATH instead...
        setx PATH "%PATH%;%GRPCURL_PATH%"
    )
    echo.
    echo PATH updated! You may need to restart your terminal.
    echo.
) else (
    echo.
    echo PATH not updated permanently.
    echo You can add it manually or run this script again.
    echo.
)

echo ==========================================
echo Testing grpcurl command...
echo ==========================================
echo.

grpcurl --version
if errorlevel 1 (
    echo.
    echo Command still not recognized. You may need to:
    echo   1. Restart your terminal
    echo   2. Or use the full path: "%GRPCURL_PATH%\grpcurl.exe"
    echo.
) else (
    echo.
    echo SUCCESS! grpcurl is now available.
    echo.
)

pause

