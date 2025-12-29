# Fix: DPM Not Recognized After Adding to PATH

## The Problem

You've added DPM to PATH correctly, and the full path works:
```cmd
"C:\Users\chiku\AppData\Roaming\dpm\cache\components\dpm\1.0.4\dpm.exe" --version
✓ version: 1.0.4
```

But `dpm` command still isn't recognized because **your current terminal session hasn't refreshed the PATH**.

## Solution: Restart Terminal

**You MUST close and reopen your terminal** for PATH changes to take effect.

### Steps:

1. **Close this terminal completely**
   - Close all terminal windows (CMD, PowerShell, Git Bash)
   - Don't just open a new tab - close the entire application

2. **Open a NEW terminal**
   - Open CMD, PowerShell, or Git Bash fresh

3. **Test DPM:**
   ```cmd
   dpm --version
   ```

4. **If it works, try building:**
   ```cmd
   dpm build
   ```

## Alternative: Refresh PATH in Current Session (Advanced)

If you can't restart the terminal, you can refresh PATH in the current session:

### In CMD:
```cmd
refreshenv
```
(If you have Chocolatey installed)

Or manually:
```cmd
set PATH=%PATH%;C:\Users\chiku\AppData\Roaming\dpm\cache\components\dpm\1.0.4
```

### In PowerShell:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### In Git Bash:
```bash
export PATH="$PATH:/c/Users/chiku/AppData/Roaming/dpm/cache/components/dpm/1.0.4"
```

**But the easiest solution is to just restart the terminal!**

## Verification

After restarting, verify PATH includes DPM:
```cmd
echo %PATH% | findstr dpm
```

Or in PowerShell:
```powershell
$env:PATH -split ';' | Select-String 'dpm'
```

