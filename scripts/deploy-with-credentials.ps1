# Deploy DAR file with credentials as parameters
# Usage: .\scripts\deploy-with-credentials.ps1 -Username "your-username" -Password "your-password"

param(
    [Parameter(Mandatory=$true)]
    [string]$Username,
    
    [Parameter(Mandatory=$true)]
    [string]$Password,
    
    [string]$DarFile = ".daml\dist\prediction-markets-1.0.0.dar",
    [string]$ClientId = "Prediction-Market",
    [switch]$RemoveExisting = $true
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploy DAR via gRPC Admin API" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$AdminApiHost = "participant.dev.canton.wolfedgelabs.com"
$AdminApiPort = 443
$Service = "com.digitalasset.canton.admin.participant.v30.PackageService/UploadDar"
$KeycloakUrl = "https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token"

# Find grpcurl
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
    exit 1
}

Write-Host "grpcurl found" -ForegroundColor Green

# Check DAR file
if (-not (Test-Path $DarFile)) {
    Write-Host "ERROR: DAR file not found: $DarFile" -ForegroundColor Red
    exit 1
}

Write-Host "DAR file: $DarFile" -ForegroundColor Green
$darSize = (Get-Item $DarFile).Length
Write-Host "Size: $darSize bytes" -ForegroundColor Gray
Write-Host ""

# Get authentication token
Write-Host "Getting authentication token..." -ForegroundColor Cyan
try {
    $body = @{
        client_id = $ClientId
        username = $Username
        password = $Password
        grant_type = "password"
    }
    
    $tokenResponse = Invoke-RestMethod -Uri $KeycloakUrl -Method Post -Body $body -ErrorAction Stop
    
    if (-not $tokenResponse.access_token) {
        Write-Host "ERROR: No access_token in response" -ForegroundColor Red
        Write-Host "Response: $($tokenResponse | ConvertTo-Json)" -ForegroundColor Yellow
        exit 1
    }
    
    $token = $tokenResponse.access_token
    Write-Host "Token obtained" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to get token" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    exit 1
}

# Remove existing packages if requested
if ($RemoveExisting) {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Removing existing packages..." -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Package ID from our project
    $packageId = "b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0"
    
    Write-Host "Attempting to remove package: $packageId" -ForegroundColor Yellow
    
    # Try to unvet and remove package
    # First, try to unvet the package
    $unvetService = "com.digitalasset.canton.admin.participant.v30.PackageService/UnvetPackage"
    $unvetRequest = @{
        package_id = $packageId
    } | ConvertTo-Json -Compress
    
    try {
        Write-Host "Attempting to unvet package..." -ForegroundColor Gray
        $unvetRequest | Out-File -FilePath "grpc_unvet_request.json" -Encoding ASCII -NoNewline
        
        $unvetArgs = @(
            "-insecure"
            "-H", "authorization: Bearer $token"
            "-d", "@"
            "${AdminApiHost}:${AdminApiPort}"
            $unvetService
        )
        
        $unvetRequest | & $grpcurlPath @unvetArgs 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Package unvetted successfully" -ForegroundColor Green
        } else {
            Write-Host "Package unvetting not supported or package not found (this is OK)" -ForegroundColor Yellow
        }
        
        if (Test-Path "grpc_unvet_request.json") {
            Remove-Item "grpc_unvet_request.json" -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "Package unvetting not available (this is OK)" -ForegroundColor Yellow
    }
    
    # Then try to remove the package
    $removeService = "com.digitalasset.canton.admin.participant.v30.PackageService/RemovePackage"
    $removeRequest = @{
        package_id = $packageId
    } | ConvertTo-Json -Compress
    
    try {
        Write-Host "Attempting to remove package..." -ForegroundColor Gray
        $removeRequest | Out-File -FilePath "grpc_remove_request.json" -Encoding ASCII -NoNewline
        
        $removeArgs = @(
            "-insecure"
            "-H", "authorization: Bearer $token"
            "-d", "@"
            "${AdminApiHost}:${AdminApiPort}"
            $removeService
        )
        
        $removeRequest | & $grpcurlPath @removeArgs 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Package removed successfully" -ForegroundColor Green
        } else {
            Write-Host "Package removal not supported or package not found (this is OK)" -ForegroundColor Yellow
            Write-Host "Continuing with upload..." -ForegroundColor Gray
        }
        
        if (Test-Path "grpc_remove_request.json") {
            Remove-Item "grpc_remove_request.json" -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "Package removal not available or failed (this is OK)" -ForegroundColor Yellow
        Write-Host "Continuing with upload..." -ForegroundColor Gray
    }
    
    Write-Host ""
}

# Read DAR file
Write-Host "Reading DAR file..." -ForegroundColor Cyan
$darBytes = [IO.File]::ReadAllBytes($DarFile)
$base64Dar = [Convert]::ToBase64String($darBytes)
Write-Host ""

# Create gRPC request
Write-Host "Creating gRPC request..." -ForegroundColor Cyan
$requestJson = @{
    dars = @(
        @{
            bytes = $base64Dar
            description = "Prediction Markets DAR file"
        }
    )
    vet_all_packages = $true
    synchronize_vetting = $true
} | ConvertTo-Json -Depth 10 -Compress

$requestJson | Out-File -FilePath "grpc_request.json" -Encoding ASCII -NoNewline
Write-Host ""

# Upload via gRPC
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Uploading DAR file via gRPC..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

try {
    $grpcurlArgs = @(
        "-insecure"
        "-H", "authorization: Bearer $token"
        "-d", "@"
        "${AdminApiHost}:${AdminApiPort}"
        $Service
    )
    
    if ($grpcurlPath -eq "grpcurl") {
        $output = $requestJson | & grpcurl @grpcurlArgs 2>&1
    } else {
        $output = $requestJson | & $grpcurlPath @grpcurlArgs 2>&1
    }
    
    $output | Out-String | Write-Host
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "SUCCESS: DAR file uploaded!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Red
        Write-Host "ERROR: gRPC upload failed" -ForegroundColor Red
        Write-Host "==========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Exception during gRPC upload" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path "grpc_request.json") {
        Remove-Item "grpc_request.json" -ErrorAction SilentlyContinue
    }
}

Write-Host "Deployment complete!" -ForegroundColor Green

