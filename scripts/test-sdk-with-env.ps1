# Test SDK 2.10.0 by setting up the environment correctly

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test SDK 2.10.0 with Environment Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Backup current daml.yaml
if (Test-Path "daml.yaml") {
    Copy-Item "daml.yaml" "daml.yaml.backup" -Force
}

# Create daml.yaml for SDK 2.10.0
$yamlContent = @"
sdk-version: 2.10.0
name: prediction-markets
version: 1.0.0
source: daml
dependencies:
  - daml-stdlib
  - daml-script
  - daml-prim
data-dependencies:
  - .lib/daml-finance-interface-account.dar
  - .lib/daml-finance-interface-holding.dar
  - .lib/daml-finance-interface-settlement.dar
  - .lib/daml-finance-interface-types-common.dar
  - .lib/daml-finance-interface-instrument-token.dar
  - .lib/daml-finance-interface-util.dar
"@

$yamlContent | Out-File -FilePath "daml.yaml" -Encoding UTF8 -NoNewline

Write-Host "Created daml.yaml for SDK 2.10.0" -ForegroundColor Green
Write-Host ""

# Set up SDK 2.10.0 environment
$sdk2100Path = "$env:USERPROFILE\AppData\Roaming\daml\sdk\2.10.0"
$sdkBinPath = "$sdk2100Path\daml-sdk\bin"

# Add SDK 2.10.0 to PATH temporarily
$originalPath = $env:PATH
$env:PATH = "$sdkBinPath;$env:PATH"

Write-Host "Added SDK 2.10.0 to PATH: $sdkBinPath" -ForegroundColor Cyan
Write-Host ""

# Check if daml is available
$damlPath = Get-Command daml -ErrorAction SilentlyContinue
if ($damlPath) {
    Write-Host "Found daml at: $($damlPath.Source)" -ForegroundColor Green
} else {
    Write-Host "WARNING: daml not found in SDK 2.10.0" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Attempting build..." -ForegroundColor Cyan
Write-Host ""

try {
    # Try using daml build
    $buildOutput = daml build 2>&1 | Out-String
    
    Write-Host "Build output:" -ForegroundColor Cyan
    Write-Host $buildOutput -ForegroundColor White
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "✅ BUILD SUCCESSFUL!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        
        $darFiles = Get-ChildItem -Path ".daml\dist" -Filter "*.dar" -ErrorAction SilentlyContinue
        if ($darFiles) {
            Write-Host ""
            Write-Host "DAR file: $($darFiles[0].FullName)" -ForegroundColor Green
        }
    } else {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Red
        Write-Host "❌ BUILD FAILED" -ForegroundColor Red
        Write-Host "==========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Restore PATH
    $env:PATH = $originalPath
}

# Restore backup
if (Test-Path "daml.yaml.backup") {
    Move-Item "daml.yaml.backup" "daml.yaml" -Force
    Write-Host ""
    Write-Host "Restored original daml.yaml" -ForegroundColor Gray
}

Write-Host ""
Read-Host "Press Enter to exit"

