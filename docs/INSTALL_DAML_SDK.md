# Installing DAML SDK on Windows

This guide will help you install the DAML SDK and its prerequisites on Windows so you can build and deploy your contracts.

## Prerequisites Checklist

- [ ] Java JDK 11 or later
- [ ] DAML SDK 2.8.0 or later (project requires 2.8.0, but newer versions work)
- [ ] Visual Studio Code (recommended, but not required for CLI usage)

## Step 1: Install Java JDK

DAML SDK requires Java JDK 11 or later. We recommend Java 17 (LTS).

### Quick Install (Recommended)

1. **Download Java JDK 17:**
   - Go to: https://adoptium.net/temurin/releases/?version=17
   - Click "Windows x64" under "JDK" → "Installer" (MSI)
   - Download the `.msi` installer file

2. **Run the installer:**
   - Double-click the downloaded `.msi` file
   - Follow the installation wizard
   - **Important:** Make sure "Set JAVA_HOME variable" and "Add to PATH" options are checked
   - Click "Install" and approve any UAC prompts

3. **Verify installation:**
   - Open a **new** PowerShell or Command Prompt window (important: must be new!)
   - Run: `java -version`
   - You should see output like: `openjdk version "17.0.x"`

### Manual Java Installation (If needed)

If the automatic installer didn't set environment variables:

1. **Set JAVA_HOME:**
   - Open "Environment Variables" (search in Start menu)
   - Under "System variables", click "New"
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x+11-hotspot` (adjust version number)
   - Click OK

2. **Add Java to PATH:**
   - In "Environment Variables", find "Path" in System variables
   - Click "Edit"
   - Click "New"
   - Add: `%JAVA_HOME%\bin`
   - Click OK on all windows

3. **Restart your terminal** and verify: `java -version`

## Step 2: Install DAML SDK

### Quick Install

1. **Download DAML SDK:**
   - Latest stable version: https://github.com/digital-asset/daml/releases/latest
   - Look for `daml-sdk-X.X.X-windows-x86_64.exe` (the Windows installer)
   - Click to download

   **Or use direct link for version 3.4.9:**
   - https://github.com/digital-asset/daml/releases/download/v3.4.9/daml-sdk-3.4.9-windows-x86_64.exe

2. **Run the installer:**
   - Double-click the downloaded `.exe` file
   - Follow the installation wizard
   - The installer will automatically:
     - Install DAML SDK
     - Add `daml` command to PATH
   - Click "Install" and approve any UAC prompts

3. **Verify installation:**
   - Open a **new** PowerShell or Command Prompt window (important: must be new!)
   - Run: `daml version`
   - You should see output like: `DAML SDK version X.X.X`

### Using the Installation Script

Alternatively, you can use the automated script:

```powershell
# Run as Administrator (Right-click PowerShell → "Run as Administrator")
powershell -ExecutionPolicy Bypass -File scripts\install-java-and-daml.ps1
```

**Note:** You'll need to approve UAC prompts for both Java and DAML SDK installations.

## Step 3: Verify Everything Works

After installation, **restart your terminal** and verify:

```powershell
# Check Java
java -version

# Check DAML SDK
daml version

# Build the project
daml build
```

If `daml build` succeeds, you're ready to deploy!

## Troubleshooting

### "java: command not found"

- **Solution:** Java is not in PATH or JAVA_HOME is not set
- Restart your terminal after installing Java
- If still not working, manually set JAVA_HOME and PATH (see "Manual Java Installation" above)

### "daml: command not found"

- **Solution:** DAML SDK is not in PATH
- Restart your terminal after installing DAML SDK
- If still not working, add DAML SDK installation directory to PATH:
  - Usually: `C:\Users\<YourUsername>\AppData\Local\daml-sdk\bin` or similar
  - Check the installation directory shown during installation

### "daml build" fails

- **Solution:** Check the error message
- Common issues:
  - Missing dependencies in `daml.yaml` (should be resolved automatically)
  - Java version too old (need JDK 11+)
  - Syntax errors in DAML files (check build output)

### Installation Script Fails

- The script requires administrator privileges
- You may need to run PowerShell as Administrator
- UAC prompts must be approved
- If automatic installation fails, use manual installation steps above

## Next Steps

Once DAML SDK is installed and `daml build` works:

1. **Build the project:**
   ```powershell
   daml build
   ```

2. **Deploy to Canton:**
   ```powershell
   scripts\deploy-to-canton.bat
   ```

3. **Or deploy manually:**
   ```powershell
   # Build first
   daml build
   
   # Upload DAR file
   curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages -H "Content-Type: application/octet-stream" --data-binary @.daml\dist\prediction-markets-1.0.0.dar
   ```

## References

- DAML Installation Docs: https://docs.daml.com/getting-started/installation.html
- DAML SDK Releases: https://github.com/digital-asset/daml/releases
- Java JDK Downloads: https://adoptium.net/

