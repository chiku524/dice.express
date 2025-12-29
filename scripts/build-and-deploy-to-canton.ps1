# Build and Deploy DAML Contracts to Canton
# Run this in PowerShell where 'daml' command is available

$ErrorActionPreference = "Stop"

$PARTICIPANT_URL = if ($env:PARTICIPANT_URL) { $env:PARTICIPANT_URL } else { "https://participant.dev.canton.wolfedgelabs.com" }
$PROJECT_NAME = "prediction-markets"
$PROJECT_VERSION = "1.0.0"
$DAR_FILE = ".daml\dist\$PROJECT_NAME-$PROJECT_VERSION.dar"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Canton DAML Build & Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Participant URL: $PARTICIPANT_URL"
Write-Host "Project: $PROJECT_NAME v$PROJECT_VERSION"
Write-Host ""

# Step 1: Check if daml command is available
Write-Host "Step 1: Checking DAML SDK..." -ForegroundColor Yellow
try {
    $damlVersion = daml version 2>&1
    Write-Host "DAML SDK Version: $damlVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: DAML SDK not found. Please install DAML SDK." -ForegroundColor Red
    Write-Host "Run: daml install 2.10.2" -ForegroundColor Yellow
    exit 1
}

# Step 2: Verify SDK version matches daml.yaml
Write-Host ""
Write-Host "Step 2: Verifying SDK version in daml.yaml..." -ForegroundColor Yellow
$damlYaml = Get-Content "daml.yaml" -Raw
if ($damlYaml -match "sdk-version:\s*(\d+\.\d+\.\d+)") {
    $requiredVersion = $matches[1]
    Write-Host "Required SDK version: $requiredVersion" -ForegroundColor Cyan
    
    # Check if correct version is installed
    $currentVersion = (daml version 2>&1).ToString().Trim()
    if ($currentVersion -ne $requiredVersion) {
        Write-Host "WARNING: Current SDK version ($currentVersion) doesn't match required ($requiredVersion)" -ForegroundColor Yellow
        Write-Host "Installing SDK $requiredVersion..." -ForegroundColor Yellow
        daml install $requiredVersion
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to install SDK $requiredVersion" -ForegroundColor Red
            exit 1
        }
    }
}

# Step 3: Build DAML project
Write-Host ""
Write-Host "Step 3: Building DAML project..." -ForegroundColor Yellow
daml build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - 'Lf1 is not supported': Packages are incompatible" -ForegroundColor Yellow
    Write-Host "  - Missing dependencies: Check daml.yaml" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $DAR_FILE)) {
    Write-Host ""
    Write-Host "ERROR: DAR file not found at $DAR_FILE" -ForegroundColor Red
    Write-Host "Build might have failed. Check the build output above." -ForegroundColor Yellow
    exit 1
}

$darSize = (Get-Item $DAR_FILE).Length / 1KB
Write-Host ""
Write-Host "SUCCESS: DAR file built!" -ForegroundColor Green
Write-Host "  Location: $DAR_FILE" -ForegroundColor Cyan
Write-Host "  Size: $([math]::Round($darSize, 2)) KB" -ForegroundColor Cyan
Write-Host ""

# Step 4: Upload DAR to Canton
Write-Host "Step 4: Uploading DAR to Canton participant..." -ForegroundColor Yellow
Write-Host "Trying v2 packages endpoint..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "$PARTICIPANT_URL/v2/packages" `
        -Method POST `
        -ContentType "application/octet-stream" `
        -InFile $DAR_FILE `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host ""
    Write-Host "SUCCESS: DAR uploaded successfully!" -ForegroundColor Green
    Write-Host "  HTTP Status: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host "  Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "v2 endpoint failed, trying v1 endpoint..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "$PARTICIPANT_URL/v1/packages" `
            -Method POST `
            -ContentType "application/octet-stream" `
            -InFile $DAR_FILE `
            -UseBasicParsing `
            -ErrorAction Stop
        
        Write-Host ""
        Write-Host "SUCCESS: DAR uploaded successfully (v1 endpoint)!" -ForegroundColor Green
        Write-Host "  HTTP Status: $($response.StatusCode)" -ForegroundColor Cyan
        Write-Host "  Response: $($response.Content)" -ForegroundColor Cyan
    } catch {
        Write-Host ""
        Write-Host "ERROR: Upload failed!" -ForegroundColor Red
        Write-Host "  Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Check:" -ForegroundColor Yellow
        Write-Host "  1. Network connection" -ForegroundColor Yellow
        Write-Host "  2. Participant URL: $PARTICIPANT_URL" -ForegroundColor Yellow
        Write-Host "  3. Authentication (if required)" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify contracts are available on Canton" -ForegroundColor Cyan
Write-Host "  2. Initialize MarketConfig (if not already done)" -ForegroundColor Cyan
Write-Host "  3. Test market creation from the frontend" -ForegroundColor Cyan
Write-Host ""

