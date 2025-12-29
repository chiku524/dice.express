# Build Cache Cleaning Issue

## The Problem

When trying to clean the build cache with `rmdir /s /q .daml`, we see errors about files in `.daml\dependencies\1.15\`. This reveals:

**The build cache has LF 1.15 dependencies cached!**

This is why we're getting "Lf1 is not supported" - the build system is trying to use cached LF 1.15 dependencies instead of LF 1.17.

## Solution: Force Clean Cache

### Option 1: Use the Force Clean Script

```cmd
.\scripts\force-clean-cache.bat
```

This script tries multiple methods to remove the cache.

### Option 2: Manual Force Clean

**Step 1: Close all DAML processes**
- Close any terminals running DAML commands
- Close any DAML-related applications

**Step 2: Delete via File Explorer**
- Open File Explorer
- Navigate to your project directory
- Delete the `.daml` folder manually
- If it says files are in use, restart your computer

**Step 3: Clean other cache locations**

```cmd
REM User cache
rmdir /s /q "%APPDATA%\daml\cache"

REM Home directory cache
rmdir /s /q "%USERPROFILE%\.daml\cache"
```

**Step 4: Verify SDK 3.4.9 is active**

```cmd
daml version
```

Should show SDK 3.4.9. If not:
```cmd
daml install 3.4.9
```

**Step 5: Rebuild**

```cmd
daml build
```

## Why This Happens

The build system caches dependencies by LF version. If you previously built with SDK 2.10.2 (LF 1.15), it cached LF 1.15 dependencies. Even after switching to SDK 3.4.9, it may try to use the cached LF 1.15 dependencies.

## Prevention

After switching SDK versions, always clean the cache:

```cmd
rmdir /s /q .daml
daml build
```

## Alternative: Use PowerShell

If batch commands fail, try PowerShell:

```powershell
Remove-Item -Recurse -Force .daml -ErrorAction SilentlyContinue
```

## After Cleaning

Once the cache is cleaned:
1. Verify SDK 3.4.9 is active: `daml version`
2. Rebuild: `daml build`
3. The build should now use LF 1.17 dependencies

