# Test different SDK versions with current packages

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Testing Different SDK Versions" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$sdkVersions = @("2.8.0", "2.10.0", "2.10.2", "3.4.9")
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
    
    # Update daml.yaml with SDK version
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
    
    # Add build-options for SDK 3.4.9
    if ($sdk -eq "3.4.9") {
        $yamlContent += "`nbuild-options:`n  - --target=2.1"
    }
    
    $yamlContent | Out-File -FilePath "daml.yaml" -Encoding UTF8 -NoNewline
    
    Write-Host "Updated daml.yaml with SDK $sdk" -ForegroundColor Cyan
    Write-Host ""
    
    # Try to install SDK
    Write-Host "Installing SDK $sdk..." -ForegroundColor Cyan
    try {
        $installOutput = daml install $sdk 2>&1 | Out-String
        Write-Host "Installation completed" -ForegroundColor Gray
    } catch {
        Write-Host "Could not install SDK (may already be installed)" -ForegroundColor Yellow
    }
    
    # Verify SDK version
    Write-Host "Verifying SDK version..." -ForegroundColor Cyan
    try {
        $versionOutput = daml version 2>&1 | Out-String
        Write-Host $versionOutput -ForegroundColor Gray
    } catch {
        Write-Host "Could not verify version" -ForegroundColor Yellow
    }
    
    # Try build
    Write-Host ""
    Write-Host "Attempting build with SDK $sdk..." -ForegroundColor Cyan
    try {
        # Use dpm build for SDK 3.4.9, daml build for older SDKs
        if ($sdk -eq "3.4.9") {
            $buildOutput = dpm build 2>&1 | Out-String
            $buildSuccess = $LASTEXITCODE -eq 0
        } else {
            $buildOutput = daml build --no-legacy-assistant-warning 2>&1 | Out-String
            $buildSuccess = $LASTEXITCODE -eq 0
        }
        
        if ($buildSuccess) {
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
            
            # Restore backup
            if (Test-Path "daml.yaml.backup") {
                Move-Item "daml.yaml.backup" "daml.yaml" -Force
            }
            
            Write-Host "Results saved to: sdk-test-results.json" -ForegroundColor Cyan
            $results | ConvertTo-Json -Depth 10 | Out-File -FilePath "sdk-test-results.json"
            
            Read-Host "Press Enter to exit"
            exit 0
        } else {
            Write-Host "❌ Build failed" -ForegroundColor Red
            $errorMsg = $buildOutput.Substring(0, [Math]::Min(300, $buildOutput.Length))
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
Write-Host "All SDK versions tested. None succeeded." -ForegroundColor Yellow
Write-Host "Results saved to: sdk-test-results.json" -ForegroundColor Cyan
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath "sdk-test-results.json"

Write-Host ""
Read-Host "Press Enter to exit"

