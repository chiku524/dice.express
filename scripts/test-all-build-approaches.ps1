# Comprehensive DAML build testing script
# Tests all possible combinations of SDK versions, DA.Finance packages, and build options

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Comprehensive DAML Build Testing" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test configurations
$testConfigs = @(
    @{
        Name = "SDK 2.8.0 with LF 1.15 target"
        SDK = "2.8.0"
        Target = "1.15"
        Packages = "v1.15.0"
    },
    @{
        Name = "SDK 2.10.0 with LF 1.15 target"
        SDK = "2.10.0"
        Target = "1.15"
        Packages = "v1.15.0"
    },
    @{
        Name = "SDK 2.10.2 with LF 1.15 target"
        SDK = "2.10.2"
        Target = "1.15"
        Packages = "v1.15.0"
    },
    @{
        Name = "SDK 3.4.9 with LF 1.17 target"
        SDK = "3.4.9"
        Target = "1.17"
        Packages = "v4.0.0"
    },
    @{
        Name = "SDK 3.4.9 with LF 2.0 target"
        SDK = "3.4.9"
        Target = "2.0"
        Packages = "v4.0.0"
    },
    @{
        Name = "SDK 3.4.9 with LF 2.1 target"
        SDK = "3.4.9"
        Target = "2.1"
        Packages = "v4.0.0"
    }
)

$results = @()

foreach ($config in $testConfigs) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host "Testing: $($config.Name)" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Backup current daml.yaml
    if (Test-Path "daml.yaml") {
        Copy-Item "daml.yaml" "daml.yaml.backup" -Force
    }
    
    # Create test daml.yaml
    $yamlContent = @"
sdk-version: $($config.SDK)
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
    
    if ($config.Target) {
        $yamlContent += "`nbuild-options:`n  - --target=$($config.Target)"
    }
    
    $yamlContent | Out-File -FilePath "daml.yaml" -Encoding UTF8 -NoNewline
    
    Write-Host "Created test daml.yaml:" -ForegroundColor Cyan
    Write-Host $yamlContent -ForegroundColor Gray
    Write-Host ""
    
    # Try to install SDK if needed
    Write-Host "Checking SDK $($config.SDK)..." -ForegroundColor Cyan
    try {
        $sdkCheck = daml version 2>&1
        if ($sdkCheck -notlike "*$($config.SDK)*") {
            Write-Host "Installing SDK $($config.SDK)..." -ForegroundColor Yellow
            daml install $($config.SDK) 2>&1 | Out-Null
        }
    } catch {
        Write-Host "Could not check/install SDK" -ForegroundColor Yellow
    }
    
    # Try build
    Write-Host "Attempting build..." -ForegroundColor Cyan
    try {
        $buildOutput = dpm build 2>&1 | Out-String
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ SUCCESS!" -ForegroundColor Green
            $results += @{
                Config = $config.Name
                Status = "SUCCESS"
                Output = $buildOutput
            }
        } else {
            Write-Host "❌ FAILED" -ForegroundColor Red
            Write-Host "Error: $($buildOutput.Substring(0, [Math]::Min(200, $buildOutput.Length)))" -ForegroundColor Red
            $results += @{
                Config = $config.Name
                Status = "FAILED"
                Error = $buildOutput
            }
        }
    } catch {
        Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results += @{
            Config = $config.Name
            Status = "ERROR"
            Error = $_.Exception.Message
        }
    }
    
    # Restore backup
    if (Test-Path "daml.yaml.backup") {
        Move-Item "daml.yaml.backup" "daml.yaml" -Force
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($result in $results) {
    $color = if ($result.Status -eq "SUCCESS") { "Green" } else { "Red" }
    Write-Host "$($result.Config): $($result.Status)" -ForegroundColor $color
}

Write-Host ""
Write-Host "Full results saved to: build-test-results.json" -ForegroundColor Cyan
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath "build-test-results.json"

Write-Host ""
Read-Host "Press Enter to exit"

