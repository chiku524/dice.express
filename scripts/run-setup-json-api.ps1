# PowerShell script to run setup via JSON API
# This is a fallback if DAML Script doesn't work

param(
    [string]$AdminParty = "Admin",
    [string]$OracleParty = "Oracle",
    [string]$LedgerUrl = "https://participant.dev.canton.wolfedgelabs.com/json-api",
    [string]$Username = "",
    [string]$Password = "",
    [string]$TokenFile = "token.json"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setup via JSON API" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get authentication token if credentials provided
if ($Username -and $Password) {
    Write-Host "--- Getting Authentication Token ---" -ForegroundColor Yellow
    Write-Host ""
    & ".\scripts\get-keycloak-token.ps1" -Username $Username -Password $Password -TokenFile $TokenFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Token acquisition failed, but continuing..." -ForegroundColor Yellow
    }
    Write-Host ""
}

# Set environment variables
$env:LEDGER_URL = $LedgerUrl
$env:ADMIN_PARTY = $AdminParty
$env:ORACLE_PARTY = $OracleParty
$env:TOKEN_FILE = $TokenFile

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Admin Party: $AdminParty"
Write-Host "  Oracle Party: $OracleParty"
Write-Host "  Ledger URL: $LedgerUrl"
Write-Host ""

# Run the setup script
Write-Host "--- Running Setup Script ---" -ForegroundColor Yellow
Write-Host ""
try {
    node scripts/setup-via-json-api.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Setup failed." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Setup error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

