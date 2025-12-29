# Simple script to run DAML Script for contract creation
# This uses the existing Setup.daml script

param(
    [string]$Username = "nico.builds@outlook.com",
    [string]$Password = "Chikuji1!",
    [string]$DarFile = ".daml\dist\prediction-markets-1.0.0.dar",
    [string]$TokenFile = "token.json"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Run DAML Script (Simple)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if DAR file exists
if (-not (Test-Path $DarFile)) {
    Write-Host "ERROR: DAR file not found: $DarFile" -ForegroundColor Red
    Write-Host "Please build the project first: daml build" -ForegroundColor Yellow
    exit 1
}

# Get authentication token
Write-Host "--- Step 1: Getting Authentication Token ---" -ForegroundColor Yellow
Write-Host ""
& ".\scripts\get-keycloak-token.ps1" -Username $Username -Password $Password -TokenFile $TokenFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Token acquisition failed, but continuing..." -ForegroundColor Yellow
}
Write-Host ""

# Extract token to token.txt for easier access
if (Test-Path $TokenFile) {
    $tokenData = Get-Content $TokenFile -Raw | ConvertFrom-Json
    if ($tokenData.access_token) {
        $tokenData.access_token | Out-File -FilePath "token.txt" -Encoding ASCII -NoNewline
        Write-Host "Token extracted to token.txt" -ForegroundColor Green
    }
}
Write-Host ""

# Check if daml command is available
Write-Host "--- Step 2: Checking DAML SDK ---" -ForegroundColor Yellow
Write-Host ""
$damlCmd = "daml"
try {
    $null = Get-Command $damlCmd -ErrorAction Stop
    Write-Host "✅ DAML SDK found in PATH" -ForegroundColor Green
} catch {
    Write-Host "⚠️  'daml' command not found in PATH" -ForegroundColor Yellow
    Write-Host "Trying to find daml.exe..." -ForegroundColor Yellow
    
    $damlPaths = @(
        "$env:USERPROFILE\AppData\Roaming\daml\bin\daml.exe",
        "$env:LOCALAPPDATA\daml\bin\daml.exe",
        "C:\daml\bin\daml.exe"
    )
    
    $damlFound = $false
    foreach ($path in $damlPaths) {
        if (Test-Path $path) {
            Write-Host "Found daml.exe at: $path" -ForegroundColor Green
            $damlCmd = $path
            $damlFound = $true
            break
        }
    }
    
    if (-not $damlFound) {
        Write-Host "ERROR: Could not find daml.exe" -ForegroundColor Red
        Write-Host "Please ensure DAML SDK is installed" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Run the DAML script
Write-Host "--- Step 3: Running DAML Setup Script ---" -ForegroundColor Yellow
Write-Host ""
Write-Host "This will:" -ForegroundColor Cyan
Write-Host "  1. Allocate parties (Admin and Oracle)" -ForegroundColor Cyan
Write-Host "  2. Create TokenBalance contract" -ForegroundColor Cyan
Write-Host "  3. Create MarketConfig contract" -ForegroundColor Cyan
Write-Host ""

$ledgerHost = "participant.dev.canton.wolfedgelabs.com"
$ledgerPort = 443

$scriptArgs = @(
    "script",
    "--dar", $DarFile,
    "--script-name", "Setup:setup",
    "--ledger-host", $ledgerHost,
    "--ledger-port", $ledgerPort.ToString()
)

# Add token if available
if (Test-Path $TokenFile) {
    $tokenData = Get-Content $TokenFile -Raw | ConvertFrom-Json
    if ($tokenData.access_token) {
        Write-Host "Using authentication token from $TokenFile" -ForegroundColor Green
        $scriptArgs += "--access-token-file"
        $scriptArgs += $TokenFile
    }
}

Write-Host "Command: $damlCmd $($scriptArgs -join ' ')" -ForegroundColor Cyan
Write-Host ""

try {
    & $damlCmd $scriptArgs
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "✅ DAML Script Completed Successfully!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Contracts created:" -ForegroundColor Green
        Write-Host "  - TokenBalance (stablecoin)" -ForegroundColor Green
        Write-Host "  - MarketConfig" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now test market creation from the frontend!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "==========================================" -ForegroundColor Red
        Write-Host "❌ DAML Script Failed (exit code: $exitCode)" -ForegroundColor Red
        Write-Host "==========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "  1. Party allocation failed" -ForegroundColor Yellow
        Write-Host "  2. Network connectivity" -ForegroundColor Yellow
        Write-Host "  3. Authentication token invalid" -ForegroundColor Yellow
        Write-Host "  4. SDK version incompatibility (v2 API vs v1 API)" -ForegroundColor Yellow
        Write-Host "  5. Party already exists but format mismatch" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Check the error message above for details." -ForegroundColor Yellow
        exit $exitCode
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to run DAML script: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

