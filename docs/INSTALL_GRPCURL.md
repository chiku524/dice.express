# Installing grpcurl on Windows

## Chocolatey Installation Failed

The `grpcurl` package is not available in Chocolatey's default repository. We need to install it manually.

## Manual Installation

### Option 1: Download Pre-built Binary (Recommended)

1. **Download grpcurl:**
   - Go to: https://github.com/fullstorydev/grpcurl/releases
   - Download the latest `grpcurl_<version>_windows_x86_64.zip` (or x86_32 if you have 32-bit Windows)

2. **Extract:**
   - Extract the zip file
   - You'll get `grpcurl.exe`

3. **Add to PATH:**
   - Option A: Copy `grpcurl.exe` to a folder already in PATH (e.g., `C:\Windows\System32`)
   - Option B: Create a new folder (e.g., `C:\tools\grpcurl`) and add it to PATH:
     - Right-click "This PC" → Properties → Advanced System Settings
     - Click "Environment Variables"
     - Under "System variables", find "Path" and click "Edit"
     - Click "New" and add the folder path
     - Click OK on all dialogs

4. **Verify:**
   ```cmd
   grpcurl --version
   ```

### Option 2: Use Scoop (If Installed)

```bash
scoop install grpcurl
```

### Option 3: Build from Source

If you have Go installed:
```bash
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
```

## Quick Setup Script

I'll create a script to help with manual installation.

## Alternative: Wait for Client's Script

Since the client mentioned they'll provide a script, we could also:
1. Wait for their script
2. See what tools they use
3. Install accordingly

## Verification

After installation, verify it works:
```cmd
grpcurl --version
```

Expected output:
```
grpcurl 1.8.9
```

