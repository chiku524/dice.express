# PowerShell script to test contract creation on Canton
# This script orchestrates package verification and MarketConfig creation

param(
    [string]$AdminParty = "Admin",
    [string]$OracleParty = "Oracle",
    [string]$LedgerUrl = "https://participant.dev.canton.wolfedgelabs.com/json-api"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Contract Creation on Canton" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:LEDGER_URL = $LedgerUrl
$env:ADMIN_PARTY = $AdminParty
$env:ORACLE_PARTY = $OracleParty

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Admin Party: $AdminParty"
Write-Host "  Oracle Party: $OracleParty"
Write-Host "  Ledger URL: $LedgerUrl"
Write-Host ""

# Step 1: Verify package
Write-Host "--- Step 1: Verify Package ---" -ForegroundColor Yellow
Write-Host ""
try {
    node scripts/verify-package.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Package verification had issues, but continuing..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Package verification failed: $_" -ForegroundColor Red
    Write-Host "Continuing with contract creation test..." -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Create TokenBalance (required for MarketConfig)
Write-Host "--- Step 2: Create TokenBalance Contract ---" -ForegroundColor Yellow
Write-Host ""
try {
    $tokenOutput = node scripts/create-token-balance.js 2>&1
    Write-Host $tokenOutput
    if ($LASTEXITCODE -ne 0) {
        Write-Host "TokenBalance creation failed." -ForegroundColor Red
        exit 1
    }
    # Extract contract ID from output
    if ($tokenOutput -match 'TOKEN_BALANCE_CID="([^"]+)"') {
        $tokenCid = $matches[1]
        $env:TOKEN_BALANCE_CID = $tokenCid
        Write-Host ""
        Write-Host "TokenBalance Contract ID: $tokenCid" -ForegroundColor Green
    } elseif ($tokenOutput -match 'Contract ID: ([^\s]+)') {
        $tokenCid = $matches[1]
        $env:TOKEN_BALANCE_CID = $tokenCid
        Write-Host ""
        Write-Host "TokenBalance Contract ID: $tokenCid" -ForegroundColor Green
    }
} catch {
    Write-Host "TokenBalance creation error: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Create MarketConfig
Write-Host "--- Step 3: Create MarketConfig Contract ---" -ForegroundColor Yellow
Write-Host ""
if (-not $env:TOKEN_BALANCE_CID) {
    Write-Host "ERROR: TOKEN_BALANCE_CID not set. Cannot create MarketConfig." -ForegroundColor Red
    exit 1
}
try {
    node scripts/create-market-config.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "MarketConfig creation failed." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "MarketConfig creation error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Contract Creation Test Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

