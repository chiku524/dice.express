# Script to switch between SDK versions
# Usage: .\scripts\switch-sdk-version.ps1 -Version "2.10.0"

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("2.10.0", "3.4.9")]
    [string]$Version
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Switch SDK Version to $Version" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Read current daml.yaml
if (-not (Test-Path "daml.yaml")) {
    Write-Host "❌ daml.yaml not found" -ForegroundColor Red
    exit 1
}

$yamlContent = Get-Content "daml.yaml" -Raw
$currentVersion = $null

if ($yamlContent -match 'sdk-version:\s*([\d.]+)') {
    $currentVersion = $matches[1]
    Write-Host "Current SDK Version: $currentVersion" -ForegroundColor Yellow
}

if ($currentVersion -eq $Version) {
    Write-Host "✅ Already using SDK $Version" -ForegroundColor Green
    exit 0
}

# Update SDK version
Write-Host "Updating SDK version to $Version..." -ForegroundColor Yellow
$yamlContent = $yamlContent -replace 'sdk-version:\s*[\d.]+', "sdk-version: $Version"

# Update build target if needed
$targetMap = @{
    "2.10.0" = "1.14"
    "3.4.9" = "2.1"
}

$targetVersion = $targetMap[$Version]
if ($targetVersion) {
    Write-Host "Updating LF target to $targetVersion..." -ForegroundColor Yellow
    if ($yamlContent -match '--target=([\d.]+)') {
        $yamlContent = $yamlContent -replace '--target=[\d.]+', "--target=$targetVersion"
    } else {
        # Add target to build-options
        if ($yamlContent -match 'build-options:') {
            $yamlContent = $yamlContent -replace 'build-options:', "build-options:`n  - --target=$targetVersion"
        }
    }
}

# Write updated daml.yaml
Set-Content -Path "daml.yaml" -Value $yamlContent -Encoding UTF8

Write-Host "✅ Updated daml.yaml" -ForegroundColor Green
Write-Host ""

# Switch Setup script if needed
if ($Version -eq "2.10.0") {
    Write-Host "Switching to Setup-2.10.0.daml..." -ForegroundColor Yellow
    if (Test-Path "daml\Setup-2.10.0.daml") {
        if (Test-Path "daml\Setup.daml") {
            Copy-Item "daml\Setup.daml" "daml\Setup-3.4.9.daml.backup" -ErrorAction SilentlyContinue
        }
        Copy-Item "daml\Setup-2.10.0.daml" "daml\Setup.daml" -Force
        Write-Host "✅ Switched to Setup-2.10.0.daml" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Setup-2.10.0.daml not found" -ForegroundColor Yellow
    }
} elseif ($Version -eq "3.4.9") {
    Write-Host "Switching to Setup.daml (3.4.9)..." -ForegroundColor Yellow
    if (Test-Path "daml\Setup-3.4.9.daml.backup") {
        Copy-Item "daml\Setup-3.4.9.daml.backup" "daml\Setup.daml" -Force
        Remove-Item "daml\Setup-3.4.9.daml.backup" -ErrorAction SilentlyContinue
        Write-Host "✅ Restored Setup.daml (3.4.9)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Backup not found, keeping current Setup.daml" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: daml build"
Write-Host "  2. Run: .\scripts\unified-setup.ps1 -Username <user> -Password <pass>"
Write-Host ""

