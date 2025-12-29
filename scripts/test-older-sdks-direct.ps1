# Test older SDK versions by using SDK-specific damlc compiler directly
# This bypasses the daml wrapper which always uses the latest SDK

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Testing Older SDK Versions (Direct damlc)" -ForegroundColor Cyan
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
    
    # Find SDK-specific damlc
    $sdkPath = "$env:USERPROFILE\AppData\Roaming\daml\sdk\$sdk"
    $damlcPath = "$sdkPath\damlc\damlc.exe"
    
    if (-not (Test-Path $damlcPath)) {
        Write-Host "[SKIP] SDK $sdk not found at: $damlcPath" -ForegroundColor Yellow
        Write-Host "Installing SDK $sdk..." -ForegroundColor Cyan
        try {
            daml install $sdk 2>&1 | Out-Null
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "Could not install SDK $sdk" -ForegroundColor Red
            continue
        }
        
        # Check again
        if (-not (Test-Path $damlcPath)) {
            Write-Host "[SKIP] SDK $sdk still not found after installation" -ForegroundColor Yellow
            continue
        }
    }
    
    Write-Host "Found damlc at: $damlcPath" -ForegroundColor Green
    Write-Host ""
    
    # Update daml.yaml with SDK version (remove --target=2.1 for older SDKs)
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
    
    Write-Host "Updated daml.yaml with SDK $sdk (no --target option for older SDKs)" -ForegroundColor Cyan
    Write-Host ""
    
    # Try build using SDK-specific damlc
    Write-Host "Attempting build with SDK $sdk damlc..." -ForegroundColor Cyan
    try {
        # Use the SDK-specific damlc directly
        $buildOutput = & $damlcPath build 2>&1 | Out-String
        
        if ($LASTEXITCODE -eq 0) {
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
            $errorMsg = $buildOutput.Substring(0, [Math]::Min(400, $buildOutput.Length))
            Write-Host "Error: $errorMsg" -ForegroundColor Red
            
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
}

Write-Host ""
Write-Host "All older SDK versions tested." -ForegroundColor Yellow
Write-Host "Results saved to: older-sdk-test-results.json" -ForegroundColor Cyan
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath "older-sdk-test-results.json"

Write-Host ""
Read-Host "Press Enter to exit"

