# Download DA.Finance source code to build with LF 2.1 target

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Download DA.Finance Source Code" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$financeRepo = "https://github.com/digital-asset/daml-finance.git"
$financeDir = "daml-finance-source"

# Check if already cloned
if (Test-Path $financeDir) {
    Write-Host "Repository already exists at: $financeDir" -ForegroundColor Yellow
    $overwrite = Read-Host "Overwrite? (Y/N)"
    if ($overwrite -ne "Y" -and $overwrite -ne "y") {
        Write-Host "Skipping download" -ForegroundColor Yellow
        exit 0
    }
    Remove-Item -Recurse -Force $financeDir
}

Write-Host "Cloning DA.Finance repository..." -ForegroundColor Cyan
Write-Host "Repository: $financeRepo" -ForegroundColor Gray
Write-Host ""

# Check if git is available
try {
    git --version | Out-Null
} catch {
    Write-Host "ERROR: git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git first" -ForegroundColor Yellow
    exit 1
}

# Clone repository
try {
    git clone $financeRepo $financeDir
    Write-Host "Repository cloned successfully!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to clone repository" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Repository location: $financeDir" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Navigate to: $financeDir" -ForegroundColor Yellow
Write-Host "2. Check available branches/tags" -ForegroundColor Yellow
Write-Host "3. Build packages with --target=2.1" -ForegroundColor Yellow
Write-Host "4. Copy built .dar files to .lib/ directory" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"

