@echo off
REM Simple batch file wrapper to run the PowerShell installation script
REM This bypasses the execution policy restriction

echo ==========================================
echo DAML SDK Installation (with Execution Policy Bypass)
echo ==========================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0install-java-and-daml.ps1"

pause

