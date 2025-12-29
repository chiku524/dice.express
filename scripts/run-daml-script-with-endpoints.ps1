# Try DAML Script with different endpoint configurations

param(
    [string]$Username = "nico.builds@outlook.com",
    [string]$Password = "Chikuji1!",
    [string]$DarFile = ".daml\dist\prediction-markets-1.0.0.dar",
    [string]$TokenFile = "token.json"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Run DAML Script (Testing Endpoints)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get authentication token
Write-Host "--- Getting Authentication Token ---" -ForegroundColor Yellow
& ".\scripts\get-keycloak-token.ps1" -Username $Username -Password $Password -TokenFile $TokenFile
if (Test-Path $TokenFile) {
    $tokenData = Get-Content $TokenFile -Raw | ConvertFrom-Json
    if ($tokenData.access_token) {
        $tokenData.access_token | Out-File -FilePath "token.txt" -Encoding ASCII -NoNewline
    }
}
Write-Host ""

# Different endpoint configurations to try
$endpoints = @(
    @{
        Name = "Standard gRPC (port 443)"
        Host = "participant.dev.canton.wolfedgelabs.com"
        Port = 443
    },
    @{
        Name = "Standard gRPC (port 5011)"
        Host = "participant.dev.canton.wolfedgelabs.com"
        Port = 5011
    },
    @{
        Name = "Admin API path (port 443)"
        Host = "participant.dev.canton.wolfedgelabs.com"
        Port = 443
        Path = "/admin-api"
    }
)

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

foreach ($endpoint in $endpoints) {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Trying: $($endpoint.Name)" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Host: $($endpoint.Host)" -ForegroundColor Cyan
    Write-Host "Port: $($endpoint.Port)" -ForegroundColor Cyan
    Write-Host ""
    
    $scriptArgs = @(
        "script",
        "--dar", $DarFile,
        "--script-name", "Setup:setup",
        "--ledger-host", $endpoint.Host,
        "--ledger-port", $endpoint.Port.ToString()
    )
    
    if (Test-Path $TokenFile) {
        $scriptArgs += "--access-token-file"
        $scriptArgs += $TokenFile
    }
    
    Write-Host "Command: $damlCmd $($scriptArgs -join ' ')" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        $output = & $damlCmd $scriptArgs 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Host ""
            Write-Host "✅ SUCCESS with $($endpoint.Name)!" -ForegroundColor Green
            Write-Host $output
            exit 0
        } else {
            Write-Host "❌ Failed with $($endpoint.Name)" -ForegroundColor Red
            Write-Host "Exit code: $exitCode" -ForegroundColor Red
            $errorMsg = $output | Select-String -Pattern "Exception|Error|failed" -CaseSensitive:$false | Select-Object -First 3
            if ($errorMsg) {
                Write-Host "Error: $errorMsg" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "❌ Exception: $_" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Trying next endpoint..." -ForegroundColor Yellow
    Write-Host ""
    Start-Sleep -Seconds 2
}

Write-Host "==========================================" -ForegroundColor Red
Write-Host "All endpoint configurations failed" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Possible issues:" -ForegroundColor Yellow
Write-Host "  1. Ledger API endpoint is different from Admin API" -ForegroundColor Yellow
Write-Host "  2. DAML Script uses gRPC Ledger API (not JSON API)" -ForegroundColor Yellow
Write-Host "  3. Need to contact client for correct Ledger API endpoint" -ForegroundColor Yellow
Write-Host ""
exit 1

