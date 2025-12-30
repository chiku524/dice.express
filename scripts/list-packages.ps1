# List deployed packages via gRPC Admin API or JSON API
# Shows all packages deployed on the participant

param(
    [string]$TokenFile = "token.json",
    [switch]$UseJsonApi = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "List Deployed Packages" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$AdminApiHost = "participant.dev.canton.wolfedgelabs.com"
$AdminApiPort = 443
$JsonApiUrl = "https://participant.dev.canton.wolfedgelabs.com/json-api"

# Get token
if (-not (Test-Path $TokenFile)) {
    Write-Host "ERROR: Token file not found: $TokenFile" -ForegroundColor Red
    Write-Host "Please run: scripts\get-keycloak-token.ps1" -ForegroundColor Yellow
    exit 1
}

try {
    $tokenData = Get-Content $TokenFile -Raw | ConvertFrom-Json
    $token = $tokenData.access_token
    
    if (-not $token) {
        Write-Host "ERROR: No access_token in token.json" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Could not extract token from $TokenFile" -ForegroundColor Red
    exit 1
}

Write-Host "Token loaded" -ForegroundColor Green
Write-Host ""

if ($UseJsonApi) {
    # Try JSON API /v2/packages endpoint
    Write-Host "Querying packages via JSON API..." -ForegroundColor Cyan
    Write-Host "Endpoint: ${JsonApiUrl}/v2/packages" -ForegroundColor Gray
    Write-Host ""
    
    try {
        $response = Invoke-RestMethod -Uri "${JsonApiUrl}/v2/packages" `
            -Method Get `
            -Headers @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            } `
            -ErrorAction Stop
        
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "Deployed Packages (JSON API)" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        
        if ($response.packages) {
            $packages = $response.packages
            Write-Host "Found $($packages.Count) package(s):" -ForegroundColor Green
            Write-Host ""
            
            foreach ($pkg in $packages) {
                Write-Host "Package ID: $($pkg.package_id)" -ForegroundColor Yellow
                if ($pkg.package_name) {
                    Write-Host "  Name: $($pkg.package_name)" -ForegroundColor Gray
                }
                if ($pkg.source_description) {
                    Write-Host "  Source: $($pkg.source_description)" -ForegroundColor Gray
                }
                Write-Host ""
            }
        } elseif ($response.result -and $response.result.packages) {
            $packages = $response.result.packages
            Write-Host "Found $($packages.Count) package(s):" -ForegroundColor Green
            Write-Host ""
            
            foreach ($pkg in $packages) {
                Write-Host "Package ID: $($pkg.package_id)" -ForegroundColor Yellow
                if ($pkg.package_name) {
                    Write-Host "  Name: $($pkg.package_name)" -ForegroundColor Gray
                }
                Write-Host ""
            }
        } else {
            Write-Host "Response format:" -ForegroundColor Yellow
            $response | ConvertTo-Json -Depth 5
        }
    } catch {
        Write-Host "ERROR: Failed to query packages via JSON API" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Trying gRPC Admin API instead..." -ForegroundColor Yellow
        $UseJsonApi = $false
    }
}

if (-not $UseJsonApi) {
    # Try gRPC Admin API ListPackages
    Write-Host "Querying packages via gRPC Admin API..." -ForegroundColor Cyan
    Write-Host "Endpoint: ${AdminApiHost}:${AdminApiPort}" -ForegroundColor Gray
    Write-Host "Service: com.digitalasset.canton.admin.participant.v30.PackageService/ListPackages" -ForegroundColor Gray
    Write-Host ""
    
    # Check grpcurl
    $grpcurlPath = $null
    try {
        $grpcurlVersion = grpcurl --version 2>&1
        if ($LASTEXITCODE -eq 0 -or $grpcurlVersion) {
            $grpcurlPath = "grpcurl"
        }
    } catch {
        $possiblePaths = @(
            "$env:USERPROFILE\go\bin\grpcurl.exe",
            "$env:LOCALAPPDATA\go\bin\grpcurl.exe"
        )
        
        foreach ($path in $possiblePaths) {
            if (Test-Path $path) {
                $grpcurlPath = $path
                break
            }
        }
    }
    
    if (-not $grpcurlPath) {
        Write-Host "ERROR: grpcurl not found" -ForegroundColor Red
        Write-Host "Please install grpcurl or use -UseJsonApi flag" -ForegroundColor Yellow
        exit 1
    }
    
    $listService = "com.digitalasset.canton.admin.participant.v30.PackageService/ListPackages"
    $listRequest = "{}" | ConvertTo-Json -Compress
    
    try {
        $listRequest | Out-File -FilePath "grpc_list_request.json" -Encoding ASCII -NoNewline
        
        $listArgs = @(
            "-insecure"
            "-H", "authorization: Bearer $token"
            "-d", "@"
            "${AdminApiHost}:${AdminApiPort}"
            $listService
        )
        
        Write-Host "Sending gRPC request..." -ForegroundColor Gray
        $output = $listRequest | & $grpcurlPath @listArgs 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "==========================================" -ForegroundColor Green
            Write-Host "Deployed Packages (gRPC Admin API)" -ForegroundColor Green
            Write-Host "==========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host $output
        } else {
            Write-Host "ERROR: Failed to list packages" -ForegroundColor Red
            Write-Host $output
        }
        
        if (Test-Path "grpc_list_request.json") {
            Remove-Item "grpc_list_request.json" -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "ERROR: Exception during gRPC request" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Package Information" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Expected Package ID: b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0" -ForegroundColor Yellow
Write-Host "Package Name: prediction-markets" -ForegroundColor Yellow
Write-Host ""
Write-Host "View packages in block explorer:" -ForegroundColor Cyan
Write-Host "  https://devnet.ccexplorer.io/" -ForegroundColor Gray
Write-Host ""

