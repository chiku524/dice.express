# DPM PATH Fix - Correct Location

## The Issue

DPM is installed, but the PATH was pointing to the wrong directory. The `dpm.exe` is actually at:

```
C:\Users\chiku\AppData\Roaming\dpm\cache\components\dpm\1.0.4\dpm.exe
```

The PATH should point to the **directory containing `dpm.exe`**, which is:
```
C:\Users\chiku\AppData\Roaming\dpm\cache\components\dpm\1.0.4
```

Not just `C:\Users\chiku\AppData\Roaming\dpm`.

## Solution: Use the Fix Script

Run the corrected fix script:

```cmd
.\scripts\fix-dpm-path-correct.bat
```

This will:
1. Point to the correct directory (`...\dpm\1.0.4`)
2. Add it to PATH via registry
3. Test that DPM works

## Manual Fix via GUI

1. Press `Win + R`
2. Type: `sysdm.cpl` and press Enter
3. Click **Advanced** tab
4. Click **Environment Variables**
5. Under **User variables**, find **Path**
6. Click **Edit**
7. Find the entry: `C:\Users\chiku\AppData\Roaming\dpm`
8. **Change it to**: `C:\Users\chiku\AppData\Roaming\dpm\cache\components\dpm\1.0.4`
9. Click **OK** on all dialogs
10. **Restart terminal**

## Quick Test with Full Path

While fixing PATH, you can test DPM with full path:

```cmd
"C:\Users\chiku\AppData\Roaming\dpm\cache\components\dpm\1.0.4\dpm.exe" --version
"C:\Users\chiku\AppData\Roaming\dpm\cache\components\dpm\1.0.4\dpm.exe" build
```

## After Fixing PATH

1. **Close current terminal completely**
2. **Open new terminal**
3. **Test:**
   ```cmd
   dpm --version
   ```
4. **If it works, try build:**
   ```cmd
   dpm build
   ```

## Important Note

Even if DPM works, remember that the packages are still LF version 1, so `dpm build` may also fail with the same "Lf1 is not supported" error. But it's worth trying.

