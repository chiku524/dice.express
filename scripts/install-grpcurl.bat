@echo off
REM Helper script to guide grpcurl installation

echo ==========================================
echo grpcurl Installation Guide
echo ==========================================
echo.
echo grpcurl is not available via Chocolatey.
echo You need to install it manually.
echo.
echo Option 1: Download Pre-built Binary (Recommended)
echo.
echo   1. Go to: https://github.com/fullstorydev/grpcurl/releases
echo   2. Download: grpcurl_<version>_windows_x86_64.zip
echo   3. Extract grpcurl.exe
echo   4. Add to PATH or copy to C:\Windows\System32
echo.
echo Option 2: Use Scoop (if installed)
echo.
echo   scoop install grpcurl
echo.
echo Option 3: Build from Source (requires Go)
echo.
echo   go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
echo.
echo ==========================================
echo Quick Download Link
echo ==========================================
echo.
echo Latest release: https://github.com/fullstorydev/grpcurl/releases/latest
echo.
echo After downloading and extracting:
echo   1. Copy grpcurl.exe to a folder in your PATH
echo   2. Or add the folder containing grpcurl.exe to your PATH
echo.
echo To verify installation, run:
echo   grpcurl --version
echo.
pause

