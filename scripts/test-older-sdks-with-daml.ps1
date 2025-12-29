# Test older SDK versions by setting SDK in daml.yaml and using daml build
# This should use the SDK specified in daml.yaml

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Testing Older SDK Versions (via daml.yaml)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$sdkVersions = @("2.8.0", "2.10.0", "2.10.2")
$results = @()

# Backup current daml.yaml
if (Test-Path "daml.yaml") {
    Copy-Item "daml.yaml" "daml.yaml.backup" -Force
}

foreach ($sdk in $sdkVersions) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host "Testing SDK $sdk" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Update daml.yaml with SDK version (no --target for older SDKs)
    $yamlContent = @"
sdk-version: $sdk
name: prediction-markets
version: 1.0.0
source: daml
dependencies:
  - daml-stdlib
  - daml-script
  - daml-prim
data-dependencies:
  - .lib/daml-finance-interface-account.dar
  - .lib/daml-finance-interface-holding.dar
  - .lib/daml-finance-interface-settlement.dar
  - .lib/daml-finance-interface-types-common.dar
  - .lib/daml-finance-interface-instrument-token.dar
  - .lib/daml-finance-interface-util.dar
"@
    
    $yamlContent | Out-File -FilePath "daml.yaml" -Encoding UTF8 -NoNewline
    
    Write-Host "Updated daml.yaml with SDK $sdk" -ForegroundColor Cyan
    Write-Host ""
    
    # Try build using daml build (should respect SDK version in daml.yaml)
    Write-Host "Attempting build with SDK $sdk..." -ForegroundColor Cyan
    try {
        # Use daml build with --no-legacy-assistant-warning to suppress warnings
        $buildOutput = daml build --no-legacy-assistant-warning 2>&1 | Out-String
        
        # Check if build succeeded by looking for error patterns
        $hasError = $buildOutput -match "error|Error|ERROR|failed|Failed|FAILED" -and 
                    $buildOutput -notmatch "WARNING"
        
        if (-not $hasError -and $LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "==========================================" -ForegroundColor Green
            Write-Host "✅ SUCCESS with SDK $sdk!" -ForegroundColor Green
            Write-Host "==========================================" -ForegroundColor Green
            Write-Host ""
            
            $results += @{
                SDK = $sdk
                Status = "SUCCESS"
                Output = $buildOutput
            }
            
            # Check if DAR was created
            $darFiles = Get-ChildItem -Path ".daml\dist" -Filter "*.dar" -ErrorAction SilentlyContinue
            if ($darFiles) {
                Write-Host "DAR file created: $($darFiles[0].Name)" -ForegroundColor Green
                Write-Host "Full path: $($darFiles[0].FullName)" -ForegroundColor Gray
            }
            
            # Restore backup
            if (Test-Path "daml.yaml.backup") {
                Move-Item "daml.yaml.backup" "daml.yaml" -Force
            }
            
            Write-Host ""
            Write-Host "Results saved to: older-sdk-test-results.json" -ForegroundColor Cyan
            $results | ConvertTo-Json -Depth 10 | Out-File -FilePath "older-sdk-test-results.json"
            
            Read-Host "Press Enter to exit"
            exit 0
        } else {
            Write-Host "❌ Build failed" -ForegroundColor Red
            $errorMsg = $buildOutput.Substring(0, [Math]::Min(500, $buildOutput.Length))
            Write-Host "Error output:" -ForegroundColor Red
            Write-Host $errorMsg -ForegroundColor Red
            
            $results += @{
                SDK = $sdk
                Status = "FAILED"
                Error = $buildOutput
            }
        }
    } catch {
        Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results += @{
            SDK = $sdk
            Status = "ERROR"
            Error = $_.Exception.Message
        }
    }
    
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Gray
}

# Restore backup
if (Test-Path "daml.yaml.backup") {
    Move-Item "daml.yaml.backup" "daml.yaml" -Force
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($result in $results) {
    $color = if ($result.Status -eq "SUCCESS") { "Green" } else { "Red" }
    Write-Host "SDK $($result.SDK): $($result.Status)" -ForegroundColor $color
    if ($result.Status -eq "FAILED" -and $result.Error) {
        $shortError = $result.Error.Substring(0, [Math]::Min(200, $result.Error.Length))
        Write-Host "  $shortError..." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "All older SDK versions tested." -ForegroundColor Yellow
Write-Host "Results saved to: older-sdk-test-results.json" -ForegroundColor Cyan
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath "older-sdk-test-results.json"

Write-Host ""
Read-Host "Press Enter to exit"

