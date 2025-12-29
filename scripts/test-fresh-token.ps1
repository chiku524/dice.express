# Test with a fresh token (created immediately before use)
# This helps diagnose if token lifetime is the issue

param(
    [string]$Username = "",
    [string]$Password = "",
    [string]$AdminParty = "Admin"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test with Fresh Token" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Request a fresh token (just created)"
Write-Host "  2. Use it immediately (within seconds)"
Write-Host "  3. Test JSON API endpoint"
Write-Host ""

if (-not $Username -or -not $Password) {
    Write-Host "ERROR: Username and Password required" -ForegroundColor Red
    Write-Host "Usage: .\scripts\test-fresh-token.ps1 -Username 'user@example.com' -Password 'password'" -ForegroundColor Yellow
    exit 1
}

# Step 1: Get fresh token
Write-Host "--- Step 1: Getting Fresh Token ---" -ForegroundColor Yellow
Write-Host ""

$tokenStartTime = Get-Date
& ".\scripts\get-keycloak-token.ps1" -Username $Username -Password $Password
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to get token" -ForegroundColor Red
    exit 1
}

& ".\scripts\extract-token.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to extract token" -ForegroundColor Red
    exit 1
}

$tokenEndTime = Get-Date
$tokenTime = ($tokenEndTime - $tokenStartTime).TotalSeconds

Write-Host ""
Write-Host "Token obtained in $([Math]::Round($tokenTime, 2)) seconds" -ForegroundColor Green
Write-Host ""

# Step 2: Verify token
Write-Host "--- Step 2: Verifying Token ---" -ForegroundColor Yellow
Write-Host ""

node scripts/verify-token.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "Token verification failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Test immediately with fresh token
Write-Host "--- Step 3: Testing JSON API with Fresh Token ---" -ForegroundColor Yellow
Write-Host ""

$testStartTime = Get-Date

# Create a minimal test command
$testCommand = @{
    actAs = @($AdminParty)
    commandId = "test-fresh-token-$(Get-Date -Format 'yyyyMMddHHmmss')"
    applicationId = "prediction-markets"
    commands = @(
        @{
            CreateCommand = @{
                templateId = "Token:TokenBalance"
                createArguments = @{
                    owner = $AdminParty
                    token = @{
                        id = "USDC"
                        symbol = "USDC"
                        name = "USD Coin"
                        decimals = 6
                        description = "Test token"
                    }
                    amount = 1000.0
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Sending test command..." -ForegroundColor Cyan
Write-Host "Command: $($testCommand.Substring(0, [Math]::Min(200, $testCommand.Length)))..." -ForegroundColor Gray
Write-Host ""

# Read token
$token = Get-Content "token.txt" -Raw -ErrorAction Stop

# Send request
$headers = @{
    "Content-Type" = "application/json"
    "Accept" = "application/json"
    "Authorization" = "Bearer $token"
}

$endpoint = "https://participant.dev.canton.wolfedgelabs.com/json-api/v2/commands/submit-and-wait"

try {
    $response = Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -Body $testCommand -ErrorAction Stop
    
    $testEndTime = Get-Date
    $testTime = ($testEndTime - $testStartTime).TotalSeconds
    $totalTime = ($testEndTime - $tokenStartTime).TotalSeconds
    
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Token age when used: $([Math]::Round($totalTime, 2)) seconds" -ForegroundColor Green
    Write-Host "Request time: $([Math]::Round($testTime, 2)) seconds" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10)
    Write-Host ""
    
} catch {
    $testEndTime = Get-Date
    $totalTime = ($testEndTime - $tokenStartTime).TotalSeconds
    
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "❌ FAILED" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Token age when used: $([Math]::Round($totalTime, 2)) seconds" -ForegroundColor Yellow
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response:" -ForegroundColor Yellow
            Write-Host $responseBody
        } catch {
            Write-Host "Could not read response body" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "If this still fails with 403, the issue is likely:" -ForegroundColor Yellow
    Write-Host "  1. Token lifetime configuration on Canton"
    Write-Host "  2. Token audience mismatch"
    Write-Host "  3. Missing required claims or roles"
    Write-Host ""
    
    exit 1
}

Write-Host "Test complete!" -ForegroundColor Green

