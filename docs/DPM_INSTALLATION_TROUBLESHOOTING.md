# DPM Installation Troubleshooting

## Issue: DPM Command Not Recognized

After installing DPM, the `dpm` command is not recognized. This is typically a PATH issue.

## Solutions

### Solution 1: Restart Terminal

After installing DPM, **close and reopen your terminal** (Command Prompt or PowerShell). PATH changes require a new terminal session.

```cmd
REM Close current terminal
REM Open new terminal
dpm --version
```

### Solution 2: Find DPM Installation Location

DPM might be installed but not in PATH. Find where it's installed:

**Common locations:**
- `%LOCALAPPDATA%\Programs\dpm`
- `%APPDATA%\dpm`
- `%USERPROFILE%\.dpm`
- `C:\Program Files\dpm`

**Check manually:**
```cmd
dir "%LOCALAPPDATA%\Programs\dpm" /s /b
dir "%APPDATA%\dpm" /s /b
dir "%USERPROFILE%\.dpm" /s /b
```

### Solution 3: Add DPM to PATH

Once you find the DPM installation directory:

**Temporary (current session only):**
```cmd
set PATH=%PATH%;C:\path\to\dpm
dpm --version
```

**Permanent (system-wide):**
```cmd
setx PATH "%PATH%;C:\path\to\dpm"
```

Then **restart your terminal**.

### Solution 4: Use Full Path

If you know where DPM is installed, use the full path:

```cmd
"C:\path\to\dpm\dpm.exe" --version
"C:\path\to\dpm\dpm.exe" build
```

### Solution 5: Verify Installation

Run the verification script:

```cmd
.\scripts\verify-dpm-installation.bat
```

This will check common installation locations.

## DPM Installation Methods

### Method 1: Download from DAML Website

1. Visit: https://docs.digitalasset.com/build/3.4/dpm/dpm.html
2. Download Windows installer
3. Run installer
4. Note the installation path
5. Add to PATH if needed

### Method 2: Via Package Manager

If available via package manager (chocolatey, scoop, etc.):

```cmd
choco install dpm
REM or
scoop install dpm
```

### Method 3: Manual Installation

1. Download DPM binary
2. Extract to a directory (e.g., `C:\tools\dpm`)
3. Add directory to PATH
4. Restart terminal

## After Adding to PATH

1. **Close current terminal**
2. **Open new terminal**
3. **Verify:**
   ```cmd
   dpm --version
   ```
4. **Try build:**
   ```cmd
   dpm build
   ```

## Quick Test

```cmd
REM 1. Find DPM
where dpm

REM 2. If not found, check common locations
dir "%LOCALAPPDATA%\Programs\dpm" /s /b 2>nul
dir "%APPDATA%\dpm" /s /b 2>nul

REM 3. If found, add to PATH (replace with actual path)
setx PATH "%PATH%;C:\actual\path\to\dpm"

REM 4. Restart terminal and test
dpm --version
```

## Important Note

Even if DPM works, it may not resolve the LF version 1 package issue. The packages themselves are incompatible, so DPM might also fail. But it's worth trying as a last resort.

