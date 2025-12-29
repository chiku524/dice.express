# Deploy DAR file using gRPC Admin API
# PowerShell version for better compatibility

param(
    [string]$DarFile = "test-contract\.daml\dist\prediction-markets-test-1.0.0.dar",
    [string]$TokenFile = "token.json"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploy DAR via gRPC Admin API" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
# Note: Admin API is at the base URL (no /admin-api path)
# JSON API is at /json-api path
$AdminApiHost = "participant.dev.canton.wolfedgelabs.com"
$AdminApiPort = 443
$Service = "com.digitalasset.canton.admin.participant.v30.PackageService/UploadDar"

# Check grpcurl - try multiple methods
$grpcurlPath = $null

# Try direct command
try {
    $grpcurlVersion = grpcurl --version 2>&1
    if ($LASTEXITCODE -eq 0 -or $grpcurlVersion) {
        Write-Host "grpcurl found: $grpcurlVersion" -ForegroundColor Green
        $grpcurlPath = "grpcurl"
    }
} catch {
    # Try to find it
    $possiblePaths = @(
        "$env:USERPROFILE\go\bin\grpcurl.exe",
        "$env:LOCALAPPDATA\go\bin\grpcurl.exe",
        "$env:GOPATH\bin\grpcurl.exe",
        "$env:USERPROFILE\Downloads\grpcurl.exe",
        "$env:USERPROFILE\Desktop\grpcurl.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $grpcurlPath = $path
            Write-Host "grpcurl found at: $path" -ForegroundColor Green
            break
        }
    }
    
    # Deep search if still not found
    if (-not $grpcurlPath) {
        $found = Get-ChildItem -Path $env:USERPROFILE -Filter "grpcurl.exe" -Recurse -ErrorAction SilentlyContinue -Depth 3 | Select-Object -First 1
        if ($found) {
            $grpcurlPath = $found.FullName
            Write-Host "grpcurl found at: $grpcurlPath" -ForegroundColor Green
        }
    }
}

if (-not $grpcurlPath) {
    Write-Host "ERROR: grpcurl is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run: scripts\find-and-setup-grpcurl.ps1" -ForegroundColor Yellow
    exit 1
}

# Check DAR file
if (-not (Test-Path $DarFile)) {
    Write-Host "ERROR: DAR file not found: $DarFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please build the test contract first:" -ForegroundColor Yellow
    Write-Host "  cd test-contract" -ForegroundColor Yellow
    Write-Host "  dpm build" -ForegroundColor Yellow
    exit 1
}

Write-Host "DAR file: $DarFile" -ForegroundColor Green
$darSize = (Get-Item $DarFile).Length
Write-Host "Size: $darSize bytes" -ForegroundColor Gray
Write-Host "Admin API: ${AdminApiHost}:${AdminApiPort}" -ForegroundColor Green
Write-Host "Service: $Service" -ForegroundColor Green
Write-Host ""

# Get token
if (-not (Test-Path $TokenFile)) {
    Write-Host "Getting authentication token..." -ForegroundColor Cyan
    & "scripts\get-keycloak-token.bat"
    if (-not (Test-Path $TokenFile)) {
        Write-Host "ERROR: Could not get token" -ForegroundColor Red
        exit 1
    }
}

# Extract token
try {
    $tokenData = Get-Content $TokenFile -Raw | ConvertFrom-Json
    $token = $tokenData.access_token
    
    if (-not $token) {
        Write-Host "ERROR: No access_token in token.json" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Token obtained (first 50 chars): $($token.Substring(0, [Math]::Min(50, $token.Length)))..." -ForegroundColor Green
} catch {
    Write-Host "ERROR: Could not extract token from $TokenFile" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""

# Read DAR file as bytes (gRPC expects bytes, not base64)
Write-Host "Reading DAR file..." -ForegroundColor Cyan
$darBytes = [IO.File]::ReadAllBytes($DarFile)
Write-Host "DAR file size: $($darBytes.Length) bytes" -ForegroundColor Gray

# Convert bytes to base64 for JSON (grpcurl will convert it back to bytes)
$base64Dar = [Convert]::ToBase64String($darBytes)
Write-Host "Base64 length: $($base64Dar.Length) characters" -ForegroundColor Gray
Write-Host ""

# Create JSON request according to UploadDarRequest format
Write-Host "Creating gRPC request..." -ForegroundColor Cyan
$requestJson = @{
    dars = @(
        @{
            bytes = $base64Dar
            description = "Test contract DAR file"
        }
    )
    vet_all_packages = $false
    synchronize_vetting = $false
} | ConvertTo-Json -Depth 10 -Compress

$requestJson | Out-File -FilePath "grpc_request.json" -Encoding ASCII -NoNewline
Write-Host "Request JSON created" -ForegroundColor Green
Write-Host ""

# Send gRPC request
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Uploading DAR file via gRPC..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Build grpcurl command
    $grpcurlArgs = @(
        "-insecure"
        "-H", "authorization: Bearer $token"
        "-d", "@"
        "${AdminApiHost}:${AdminApiPort}"
        $Service
    )
    
    Write-Host "Running: grpcurl $($grpcurlArgs -join ' ')" -ForegroundColor Gray
    Write-Host ""
    
    # Run grpcurl with input from file
    if ($grpcurlPath -eq "grpcurl") {
        $requestJson | & grpcurl @grpcurlArgs
    } else {
        $requestJson | & $grpcurlPath @grpcurlArgs
    }
    
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
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "  1. Network connection issue" -ForegroundColor Yellow
        Write-Host "  2. Authentication token invalid" -ForegroundColor Yellow
        Write-Host "  3. Admin API endpoint not accessible" -ForegroundColor Yellow
        Write-Host "  4. DAR file too large (gRPC message size limit)" -ForegroundColor Yellow
        Write-Host "  5. Service name or method incorrect" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Exception during gRPC upload" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Cleanup
    if (Test-Path "grpc_request.json") {
        Remove-Item "grpc_request.json" -ErrorAction SilentlyContinue
    }
}

Write-Host "Done!" -ForegroundColor Green

