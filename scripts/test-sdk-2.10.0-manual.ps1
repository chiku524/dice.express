# Manual test of SDK 2.10.0 by setting up environment and using SDK tools directly

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Manual Test: SDK 2.10.0" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Backup current daml.yaml
if (Test-Path "daml.yaml") {
    Copy-Item "daml.yaml" "daml.yaml.backup" -Force
}

# Create daml.yaml for SDK 2.10.0 (no --target, older SDKs use LF 1.15)
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
$damlcPath = "$sdk2100Path\damlc\damlc.exe"

if (-not (Test-Path $damlcPath)) {
    Write-Host "ERROR: SDK 2.10.0 not found at: $damlcPath" -ForegroundColor Red
    exit 1
}

Write-Host "Using damlc from: $damlcPath" -ForegroundColor Cyan
Write-Host ""

# Try to build using damlc with explicit package paths
Write-Host "Attempting build..." -ForegroundColor Cyan
Write-Host ""

# First, let's check what packages damlc can see
Write-Host "Checking available packages..." -ForegroundColor Yellow
$packageCheck = & $damlcPath --help 2>&1 | Out-String
Write-Host $packageCheck.Substring(0, [Math]::Min(300, $packageCheck.Length)) -ForegroundColor Gray
Write-Host ""

# Try building with damlc build
Write-Host "Running: $damlcPath build" -ForegroundColor Cyan
$buildOutput = & $damlcPath build 2>&1

Write-Host ""
Write-Host "Build output:" -ForegroundColor Cyan
Write-Host $buildOutput -ForegroundColor White

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "✅ BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    
    # Check for DAR file
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

# Restore backup
if (Test-Path "daml.yaml.backup") {
    Move-Item "daml.yaml.backup" "daml.yaml" -Force
    Write-Host ""
    Write-Host "Restored original daml.yaml" -ForegroundColor Gray
}

Write-Host ""
Read-Host "Press Enter to exit"

