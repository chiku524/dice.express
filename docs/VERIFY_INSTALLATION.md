# Verifying DAML SDK Installation

After installing Java and DAML SDK, you need to **restart your terminal** for the PATH changes to take effect.

## Quick Verification

### Option 1: Use the Verification Script

Run this batch file:
```cmd
scripts\verify-installation.bat
```

### Option 2: Manual Verification

**Important:** Close your current terminal and open a **new** PowerShell or Command Prompt window, then run:

```powershell
# Check Java
java -version

# Check DAML SDK
daml version

# If both work, try building the project
daml build
```

## Why Do I Need to Restart My Terminal?

When software is installed on Windows, it updates the system PATH environment variable. However, your current terminal session still has the old PATH loaded. Restarting the terminal loads the updated PATH with the new installations.

## Troubleshooting

### "java: command not found" or "daml: command not found"

1. **Restart your terminal** (close and open a new one)
2. Try the commands again
3. If still not working, check:
   - **Java:** Look for installation in `C:\Program Files\Eclipse Adoptium\` or `C:\Program Files\Java\`
   - **DAML SDK:** Look for installation in `C:\Users\<YourUsername>\AppData\Local\daml-sdk\`

### Still Not Working After Restart

You may need to manually add to PATH:

1. Search for "Environment Variables" in Windows Start menu
2. Click "Environment Variables"
3. Under "System variables" or "User variables", find "Path"
4. Click "Edit"
5. Add the installation directories:
   - Java: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x+11-hotspot\bin`
   - DAML SDK: `C:\Users\<YourUsername>\AppData\Local\daml-sdk\bin` (or wherever it was installed)

### Find Installation Locations

**Java:**
```powershell
# In PowerShell, run:
Get-ChildItem "C:\Program Files\Eclipse Adoptium\" -ErrorAction SilentlyContinue
Get-ChildItem "C:\Program Files\Java\" -ErrorAction SilentlyContinue
```

**DAML SDK:**
```powershell
# In PowerShell, run:
Get-ChildItem "$env:LOCALAPPDATA\daml-sdk\" -ErrorAction SilentlyContinue
```

## Once Verified

If `daml version` and `java -version` both work:

1. **Build the project:**
   ```cmd
   daml build
   ```

2. **Deploy to Canton:**
   ```cmd
   scripts\deploy-to-canton.bat
   ```

