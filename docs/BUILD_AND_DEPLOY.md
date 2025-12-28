# Building and Deploying to Canton

## Quick Start

Since `daml version` works in your desktop terminal (Windows Terminal or CMD), use that terminal to build and deploy:

### Option 1: Use the All-in-One Script (Recommended)

1. Open **Command Prompt** or **Windows Terminal** (the one where `daml version` works)
2. Navigate to your project:
   ```cmd
   cd C:\Users\chiku\OneDrive\Desktop\coding-projects\upwork-canton-daml-project
   ```
3. Run the build and deploy script:
   ```cmd
   scripts\build-and-deploy-direct.bat
   ```

This script will:
- Verify DAML SDK is available
- Build the DAML project
- Upload the DAR file to Canton

### Option 2: Manual Steps

If you prefer to run commands manually:

1. **Build the project:**
   ```cmd
   daml build
   ```

2. **Deploy to Canton:**
   ```cmd
   scripts\deploy-to-canton.bat
   ```

Or upload manually:
   ```cmd
   curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages -H "Content-Type: application/octet-stream" --data-binary "@.daml\dist\prediction-markets-1.0.0.dar"
   ```

## Why PowerShell/Git Bash Don't Work

PowerShell and Git Bash may not have refreshed their PATH environment variable yet. This is normal - they cache the PATH when they start. 

**Solutions:**
- Use Command Prompt or Windows Terminal (they work!)
- Or restart PowerShell/Git Bash after installation
- Or manually refresh PATH in PowerShell:
  ```powershell
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  ```

## Verifying Deployment

After deployment, you should see:
- HTTP Status: 200 or 201 (success)
- Or an error message with details

If you get a 200/201 response, the DAR file was uploaded successfully!

## Next Steps After Deployment

1. **Test market creation:**
   - Go to your frontend: https://upwork-canton-daml-project.vercel.app
   - Try creating a market
   - It should now work with the updated template (Optional fields)

2. **Verify the deployment:**
   - Check Canton participant logs (if you have access)
   - Or test by creating a market and checking it doesn't fail with field validation errors

## Troubleshooting

### "daml: command not found" in Script

The script tries to find DAML in:
- System PATH (default)
- `%LOCALAPPDATA%\daml-sdk\bin\daml.exe` (common installation location)

If neither works, you may need to:
1. Add DAML SDK to PATH manually (see VERIFY_INSTALLATION.md)
2. Or run the commands manually from the terminal where `daml version` works

### Build Fails

Common issues:
- Missing dependencies (should auto-download)
- Syntax errors in DAML files (check build output)
- Java version issue (need JDK 11+)

### Upload Fails

Possible reasons:
- Network connectivity issues
- Canton participant requires authentication
- Package endpoint not enabled
- DAR file path incorrect

Check the HTTP status code in the response for more details.

