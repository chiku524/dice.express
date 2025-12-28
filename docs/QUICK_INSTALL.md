# Quick Installation Guide

## Option 1: Use the Batch File (Easiest)

Simply double-click or run:
```cmd
scripts\install-daml-sdk.bat
```

This will automatically bypass PowerShell execution policy restrictions.

## Option 2: Run PowerShell Command Directly

Open PowerShell (regular or Admin) and run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-java-and-daml.ps1
```

## Option 3: Change Execution Policy (One-time, Requires Admin)

If you want to allow scripts to run in general:

1. Open PowerShell as Administrator
2. Run:
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Type `Y` when prompted
4. Then you can run scripts normally: `.\scripts\install-java-and-daml.ps1`

**Note:** The `RemoteSigned` policy allows locally created scripts to run, but still blocks unsigned scripts from the internet. This is a safe setting.

## Option 4: Manual Installation

If scripts don't work, follow the manual installation steps in `docs/INSTALL_DAML_SDK.md`:
- Download Java JDK 17: https://adoptium.net/temurin/releases/?version=17
- Download DAML SDK: https://github.com/digital-asset/daml/releases/download/v3.4.9/daml-sdk-3.4.9-windows-x86_64.exe
- Run both installers manually

