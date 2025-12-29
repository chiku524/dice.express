# Test various Ledger API endpoint configurations
# Uses grpcurl if available, or tries DAML Script with different endpoints

param(
    [string]$TokenFile = "token.json"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Ledger API Endpoints" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Endpoints to test based on research
$endpoints = @(
    @{
        Name = "Standard Ledger API Port (6865)"
        Host = "participant.dev.canton.wolfedgelabs.com"
        Port = 6865
        TLS = $false
    },
    @{
        Name = "Alternative Port (5011)"
        Host = "participant.dev.canton.wolfedgelabs.com"
        Port = 5011
        TLS = $false
    },
    @{
        Name = "HTTPS Port 443 (with TLS)"
        Host = "participant.dev.canton.wolfedgelabs.com"
        Port = 443
        TLS = $true
    },
    @{
        Name = "HTTPS Port 443 (without TLS)"
        Host = "participant.dev.canton.wolfedgelabs.com"
        Port = 443
        TLS = $false
    }
)

# Check if grpcurl is available
$grpcurlAvailable = $false
try {
    $null = Get-Command "grpcurl" -ErrorAction Stop
    $grpcurlAvailable = $true
    Write-Host "✅ grpcurl found - will use for testing" -ForegroundColor Green
} catch {
    Write-Host "⚠️  grpcurl not found - will use DAML Script for testing" -ForegroundColor Yellow
}
Write-Host ""

# Test each endpoint
foreach ($endpoint in $endpoints) {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Testing: $($endpoint.Name)" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Host: $($endpoint.Host)" -ForegroundColor Cyan
    Write-Host "Port: $($endpoint.Port)" -ForegroundColor Cyan
    Write-Host "TLS: $($endpoint.TLS)" -ForegroundColor Cyan
    Write-Host ""
    
    if ($grpcurlAvailable) {
        # Use grpcurl to test
        $grpcurlArgs = @()
        if (-not $endpoint.TLS) {
            $grpcurlArgs += "-plaintext"
        }
        $grpcurlArgs += "$($endpoint.Host):$($endpoint.Port)"
        $grpcurlArgs += "list"
        
        Write-Host "Command: grpcurl $($grpcurlArgs -join ' ')" -ForegroundColor Cyan
        Write-Host ""
        
        try {
            $output = & grpcurl $grpcurlArgs 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ SUCCESS! Endpoint is accessible" -ForegroundColor Green
                Write-Host "Available services:" -ForegroundColor Green
                $output | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
                Write-Host ""
                Write-Host "This endpoint can be used for DAML Script!" -ForegroundColor Green
                exit 0
            } else {
                Write-Host "❌ Connection failed" -ForegroundColor Red
                $output | Select-Object -First 3 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
            }
        } catch {
            Write-Host "❌ Error: $_" -ForegroundColor Red
        }
    } else {
        # Use DAML Script to test (if DAR file exists)
        $darFile = ".daml\dist\prediction-markets-1.0.0.dar"
        if (-not (Test-Path $darFile)) {
            Write-Host "⚠️  DAR file not found, skipping DAML Script test" -ForegroundColor Yellow
            Write-Host ""
            continue
        }
        
        $damlCmd = "daml"
        try {
            $null = Get-Command $damlCmd -ErrorAction Stop
        } catch {
            $damlPaths = @(
                "$env:USERPROFILE\AppData\Roaming\daml\bin\daml.exe",
                "$env:LOCALAPPDATA\daml\bin\daml.exe"
            )
            foreach ($path in $damlPaths) {
                if (Test-Path $path) {
                    $damlCmd = $path
                    break
                }
            }
        }
        
        $scriptArgs = @(
            "script",
            "--dar", $darFile,
            "--script-name", "Setup:setup",
            "--ledger-host", $endpoint.Host,
            "--ledger-port", $endpoint.Port.ToString()
        )
        
        if ($endpoint.TLS) {
            $scriptArgs += "--tls"
        }
        
        if (Test-Path $TokenFile) {
            $scriptArgs += "--access-token-file"
            $scriptArgs += $TokenFile
        }
        
        Write-Host "Command: $damlCmd $($scriptArgs -join ' ')" -ForegroundColor Cyan
        Write-Host ""
        
        try {
            $output = & $damlCmd $scriptArgs 2>&1 | Select-Object -First 10
            $exitCode = $LASTEXITCODE
            
            if ($exitCode -eq 0) {
                Write-Host "✅ SUCCESS! Endpoint is accessible" -ForegroundColor Green
                Write-Host "This endpoint can be used for DAML Script!" -ForegroundColor Green
                exit 0
            } else {
                Write-Host "❌ Connection failed (exit code: $exitCode)" -ForegroundColor Red
                $errorMsg = $output | Select-String -Pattern "Exception|Error|failed|reset" -CaseSensitive:$false | Select-Object -First 2
                if ($errorMsg) {
                    Write-Host "Error: $errorMsg" -ForegroundColor Yellow
                }
            }
        } catch {
            Write-Host "❌ Error: $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Trying next endpoint..." -ForegroundColor Yellow
    Write-Host ""
    Start-Sleep -Seconds 1
}

Write-Host "==========================================" -ForegroundColor Red
Write-Host "All endpoint tests failed" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Conclusion:" -ForegroundColor Yellow
Write-Host "  Ledger API is likely not publicly exposed" -ForegroundColor Yellow
Write-Host "  JSON API is the intended public interface" -ForegroundColor Yellow
Write-Host "  Continue with JSON API approach" -ForegroundColor Yellow
Write-Host ""
exit 1

