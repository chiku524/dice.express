# Unified Setup Script
# Tries multiple setup methods in order until one succeeds

param(
    [string]$Username = "",
    [string]$Password = "",
    [string]$AdminParty = "Admin",
    [string]$OracleParty = "Oracle",
    [string]$LedgerUrl = "https://participant.dev.canton.wolfedgelabs.com/json-api",
    [switch]$SkipDamlScript = $false,
    [switch]$SkipJsonApi = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Unified Setup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will try multiple setup methods:" -ForegroundColor Yellow
Write-Host "  1. DAML Script (SDK 3.4.9) - if SDK 3.4.9 is active"
Write-Host "  2. DAML Script (SDK 2.10.0) - if SDK 2.10.0 is active"
Write-Host "  3. JSON API Script (fallback)"
Write-Host ""

# Check compatibility first
Write-Host "--- Checking Compatibility ---" -ForegroundColor Yellow
Write-Host ""
try {
    node scripts/check-compatibility.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Compatibility check found issues, but continuing..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not run compatibility check, continuing..." -ForegroundColor Yellow
}
Write-Host ""

# Get authentication token if credentials provided
$tokenFile = "token.json"
$tokenTxt = "token.txt"
if ($Username -and $Password) {
    Write-Host "--- Getting Authentication Token ---" -ForegroundColor Yellow
    Write-Host ""
    & ".\scripts\get-keycloak-token.ps1" -Username $Username -Password $Password -TokenFile $tokenFile
    if ($LASTEXITCODE -eq 0) {
        & ".\scripts\extract-token.ps1"
    }
    Write-Host ""
}

# Read SDK version from daml.yaml
$sdkVersion = $null
if (Test-Path "daml.yaml") {
    $yamlContent = Get-Content "daml.yaml" -Raw
    if ($yamlContent -match 'sdk-version:\s*([\d.]+)') {
        $sdkVersion = $matches[1]
    }
}

Write-Host "Detected SDK Version: $sdkVersion" -ForegroundColor Cyan
Write-Host ""

# Method 1: Try DAML Script (SDK 3.4.9)
if (-not $SkipDamlScript -and $sdkVersion -eq "3.4.9") {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Method 1: DAML Script (SDK 3.4.9)" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    
    if (Test-Path "token.txt") {
        try {
            & ".\scripts\run-setup-script.ps1" -Password $Password
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Setup completed successfully using DAML Script (SDK 3.4.9)!" -ForegroundColor Green
                exit 0
            } else {
                Write-Host "❌ DAML Script (SDK 3.4.9) failed, trying next method..." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ DAML Script (SDK 3.4.9) error: $_" -ForegroundColor Yellow
            Write-Host "Trying next method..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  No authentication token found, skipping DAML Script" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Method 2: Try DAML Script (SDK 2.10.0)
if (-not $SkipDamlScript -and $sdkVersion -eq "2.10.0") {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Method 2: DAML Script (SDK 2.10.0)" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    
    if (Test-Path "token.txt") {
        try {
            # Check if Setup-2.10.0.daml exists, if so, temporarily rename it
            $backupSetup = $false
            if (Test-Path "daml\Setup-2.10.0.daml") {
                if (Test-Path "daml\Setup.daml") {
                    Copy-Item "daml\Setup.daml" "daml\Setup-3.4.9.daml.backup" -ErrorAction SilentlyContinue
                    $backupSetup = $true
                }
                Copy-Item "daml\Setup-2.10.0.daml" "daml\Setup.daml" -Force
            }
            
            # Rebuild with SDK 2.10.0
            Write-Host "Rebuilding with SDK 2.10.0..." -ForegroundColor Yellow
            daml build
            if ($LASTEXITCODE -eq 0) {
                & ".\scripts\run-setup-script.ps1" -Password $Password
                if ($LASTEXITCODE -eq 0) {
                    # Restore original Setup.daml if backed up
                    if ($backupSetup -and (Test-Path "daml\Setup-3.4.9.daml.backup")) {
                        Copy-Item "daml\Setup-3.4.9.daml.backup" "daml\Setup.daml" -Force
                        Remove-Item "daml\Setup-3.4.9.daml.backup" -ErrorAction SilentlyContinue
                    }
                    Write-Host ""
                    Write-Host "✅ Setup completed successfully using DAML Script (SDK 2.10.0)!" -ForegroundColor Green
                    exit 0
                }
            }
            
            # Restore original Setup.daml if backed up
            if ($backupSetup -and (Test-Path "daml\Setup-3.4.9.daml.backup")) {
                Copy-Item "daml\Setup-3.4.9.daml.backup" "daml\Setup.daml" -Force
                Remove-Item "daml\Setup-3.4.9.daml.backup" -ErrorAction SilentlyContinue
            }
            
            Write-Host "❌ DAML Script (SDK 2.10.0) failed, trying next method..." -ForegroundColor Yellow
        } catch {
            Write-Host "❌ DAML Script (SDK 2.10.0) error: $_" -ForegroundColor Yellow
            Write-Host "Trying next method..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  No authentication token found, skipping DAML Script" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Method 3: Try JSON API (fallback)
if (-not $SkipJsonApi) {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Method 3: JSON API Script (Fallback)" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    
    try {
        & ".\scripts\run-setup-json-api.ps1" `
            -Username $Username `
            -Password $Password `
            -AdminParty $AdminParty `
            -OracleParty $OracleParty `
            -LedgerUrl $LedgerUrl
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Setup completed successfully using JSON API!" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "❌ JSON API setup failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ JSON API setup error: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# All methods failed
Write-Host "==========================================" -ForegroundColor Red
Write-Host "❌ All Setup Methods Failed" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Please check:" -ForegroundColor Yellow
Write-Host "  1. Authentication credentials are correct"
Write-Host "  2. Parties are allocated on Canton"
Write-Host "  3. DAR file is deployed"
Write-Host "  4. Network connectivity"
Write-Host "  5. Canton JSON API is enabled"
Write-Host ""
exit 1

