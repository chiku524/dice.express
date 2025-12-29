@echo off
REM Try to inspect package LF versions

echo ==========================================
echo Inspecting Package LF Versions
echo ==========================================
echo.

echo Attempting to inspect packages...
echo.

REM Try using daml damlc inspect-dar (may not work if packages are LF 1)
echo Checking daml-finance-interface-account.dar...
daml damlc inspect-dar .lib\daml-finance-interface-account.dar 2>&1 | findstr /C:"LF" /C:"version" /C:"error" /C:"ParseError"
echo.

echo If you see "Lf1 is not supported", the package is LF version 1
echo If you see "1.17" or "1.15", that's the LF version
echo.

pause

