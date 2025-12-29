# Request a new JWT token from Keycloak
# This ensures we have a fresh token after onboarding

param(
    [string]$Username = "nico.builds@outlook.com",
    [string]$Password = "Chikuji1!",
    [string]$ClientId = "Prediction-Market"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Request New JWT Token" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get fresh token
Write-Host "Requesting new token from Keycloak..." -ForegroundColor Yellow
Write-Host "Username: $Username" -ForegroundColor Gray
Write-Host "Client ID: $ClientId" -ForegroundColor Gray
Write-Host ""

& ".\scripts\get-keycloak-token.ps1" -Username $Username -Password $Password -ClientId $ClientId

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Failed to get token" -ForegroundColor Red
    exit 1
}

# Extract token to token.txt
Write-Host ""
Write-Host "Extracting token..." -ForegroundColor Yellow
& ".\scripts\extract-token.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  Warning: Could not extract token to token.txt" -ForegroundColor Yellow
    Write-Host "   Token is still available in token.json" -ForegroundColor Gray
} else {
    Write-Host "✅ Token extracted to token.txt" -ForegroundColor Green
}

# Verify token
Write-Host ""
Write-Host "Verifying token..." -ForegroundColor Yellow
node scripts/verify-token.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "✅ New token obtained successfully!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Token is ready to use for:" -ForegroundColor Cyan
    Write-Host "  - JSON API requests" -ForegroundColor Gray
    Write-Host "  - gRPC Admin API requests" -ForegroundColor Gray
    Write-Host "  - Contract creation" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "⚠️  Token verification had warnings" -ForegroundColor Yellow
    Write-Host "   Token may still be valid, check output above" -ForegroundColor Gray
}

