# PowerShell script to install Java JDK and DAML SDK on Windows
# This script downloads and installs Java JDK 17 (LTS) and then DAML SDK

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Java JDK + DAML SDK Installation Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Java is already installed
Write-Host "Step 1: Checking for Java JDK..." -ForegroundColor Yellow
$javaCheck = Get-Command java -ErrorAction SilentlyContinue
if ($javaCheck) {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "[OK] Java already installed: $javaVersion" -ForegroundColor Green
    $javaInstalled = $true
} else {
    Write-Host "Java JDK not found. Will install Java JDK 17 (LTS)..." -ForegroundColor Yellow
    $javaInstalled = $false
}
Write-Host ""

# Step 2: Install Java JDK if needed
if (-not $javaInstalled) {
    Write-Host "Step 2: Installing Java JDK 17 (LTS)..." -ForegroundColor Yellow
    Write-Host "Downloading Eclipse Temurin JDK 17..." -ForegroundColor Gray
    
    # Download Java JDK 17 installer (MSI)
    $javaUrl = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk"
    $javaInstallerPath = Join-Path $env:TEMP "OpenJDK17U-jdk_x64_windows_hotspot.msi"
    
    try {
        # Use a direct download link for Java 17
        $javaDownloadUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.13%2B11/OpenJDK17U-jdk_x64_windows_hotspot_17.0.13_11.msi"
        Write-Host "Downloading from: $javaDownloadUrl" -ForegroundColor Gray
        Invoke-WebRequest -Uri $javaDownloadUrl -OutFile $javaInstallerPath -UseBasicParsing
        Write-Host "[OK] Java installer downloaded" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Installing Java JDK 17 (this may require administrator privileges)..." -ForegroundColor Yellow
        Write-Host "Please approve the UAC prompt if it appears." -ForegroundColor Yellow
        
        # Install Java silently
        $installArgs = "/i `"$javaInstallerPath`" /quiet ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJarFileRunWith,FeatureJavaHome INSTALLDIR=`"C:\Program Files\Eclipse Adoptium\jdk-17.0.13+11-hotspot`""
        Start-Process msiexec.exe -ArgumentList $installArgs -Wait -Verb RunAs
        
        # Set JAVA_HOME
        $javaHome = "C:\Program Files\Eclipse Adoptium\jdk-17.0.13+11-hotspot"
        if (Test-Path $javaHome) {
            [Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, [EnvironmentVariableTarget]::Machine)
            $env:JAVA_HOME = $javaHome
            Write-Host "[OK] JAVA_HOME set to: $javaHome" -ForegroundColor Green
            
            # Add Java to PATH
            $javaBin = Join-Path $javaHome "bin"
            $currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
            if ($currentPath -notlike "*$javaBin*") {
                $newPath = "$currentPath;$javaBin"
                [Environment]::SetEnvironmentVariable("Path", $newPath, [EnvironmentVariableTarget]::Machine)
                $env:Path = "$env:Path;$javaBin"
                Write-Host "[OK] Added Java to PATH" -ForegroundColor Green
            }
        } else {
            Write-Host "WARNING: Java installation directory not found at expected location." -ForegroundColor Yellow
            Write-Host "You may need to set JAVA_HOME manually." -ForegroundColor Yellow
        }
        
        Write-Host "[OK] Java JDK 17 installation completed" -ForegroundColor Green
        Write-Host ""
        Write-Host "IMPORTANT: Please restart your terminal/PowerShell for Java to be available." -ForegroundColor Yellow
        Write-Host "Press any key to continue with DAML SDK installation..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } catch {
        Write-Host "ERROR: Failed to install Java JDK." -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install Java JDK 17 manually from:" -ForegroundColor Yellow
        Write-Host "https://adoptium.net/temurin/releases/?version=17" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "After installing Java, run this script again or continue with DAML SDK installation." -ForegroundColor Yellow
        exit 1
    }
}
Write-Host ""

# Step 3: Install DAML SDK
Write-Host "Step 3: Installing DAML SDK..." -ForegroundColor Yellow

# Get latest stable DAML SDK version (using 2.8.0 as required by project, or latest stable)
$targetVersion = "3.4.9"  # Latest stable version
Write-Host "Target DAML SDK version: $targetVersion" -ForegroundColor Gray

$damlInstallerUrl = "https://github.com/digital-asset/daml/releases/download/v$targetVersion/daml-sdk-$targetVersion-windows-x86_64.exe"
$damlInstallerPath = Join-Path $env:TEMP "daml-sdk-$targetVersion-windows-x86_64.exe"

Write-Host "Downloading DAML SDK installer..." -ForegroundColor Yellow
Write-Host "URL: $damlInstallerUrl" -ForegroundColor Gray

try {
    Invoke-WebRequest -Uri $damlInstallerUrl -OutFile $damlInstallerPath -UseBasicParsing
    Write-Host "[OK] Download complete" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to download DAML SDK installer." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download manually from:" -ForegroundColor Yellow
    Write-Host "https://github.com/digital-asset/daml/releases/tag/v$targetVersion" -ForegroundColor Cyan
    exit 1
}
Write-Host ""

Write-Host "Running DAML SDK installer (this may require administrator privileges)..." -ForegroundColor Yellow
Write-Host "Please follow the installation wizard that opens." -ForegroundColor Yellow
Write-Host ""

# Run installer (EXE installer - requires user interaction)
try {
    Start-Process $damlInstallerPath -Wait -Verb RunAs
    Write-Host "[OK] DAML SDK installation completed" -ForegroundColor Green
} catch {
    Write-Host "ERROR: DAML SDK installation failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run the installer manually:" -ForegroundColor Yellow
    Write-Host $damlInstallerPath -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close and restart your terminal/PowerShell" -ForegroundColor White
Write-Host "2. Verify Java: java -version" -ForegroundColor White
Write-Host "3. Verify DAML: daml version" -ForegroundColor White
Write-Host "4. Build project: daml build" -ForegroundColor White
Write-Host "5. Deploy: scripts\deploy-to-canton.bat" -ForegroundColor White
Write-Host ""

