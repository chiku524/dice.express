@echo off
REM Quick script to run PowerShell find-and-setup script

powershell -ExecutionPolicy Bypass -File "%~dp0find-and-setup-grpcurl.ps1"

