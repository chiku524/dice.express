# Simplified script to build DA.Finance packages with LF 2.1
# Builds packages in dependency order

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Build DA.Finance Packages with LF 2.1" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$financeDir = "daml-finance-source"
$targetLF = "2.1"

if (-not (Test-Path $financeDir)) {
    Write-Host "ERROR: DA.Finance source not found" -ForegroundColor Red
    exit 1
}

# Packages in dependency order (must build dependencies first)
$packages = @(
    "Daml.Finance.Interface.Types.Common.V3",
    "Daml.Finance.Interface.Util.V3",
    "Daml.Finance.Interface.Holding.V4",
    "Daml.Finance.Interface.Account.V4",
    "Daml.Finance.Interface.Settlement.V4",
    "Daml.Finance.Interface.Instrument.Token.V4"
)

$builtPackages = @()

foreach ($packageName in $packages) {
    $packageDir = Join-Path $financeDir "package\main\daml\$packageName"
    
    if (-not (Test-Path $packageDir)) {
        Write-Host "[SKIP] $packageName - directory not found" -ForegroundColor Yellow
        continue
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host "Building: $packageName" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location $packageDir
    
    try {
        # Read and update daml.yaml
        $yamlPath = "daml.yaml"
        if (-not (Test-Path $yamlPath)) {
            Write-Host "[SKIP] No daml.yaml found" -ForegroundColor Yellow
            Pop-Location
            continue
        }
        
        # Read YAML as lines to preserve structure
        $yamlLines = Get-Content $yamlPath
        
        # Backup original
        Copy-Item $yamlPath "$yamlPath.backup" -Force
        
        # Update SDK version and build-options
        $newYamlLines = @()
        $buildOptionsFound = $false
        
        foreach ($line in $yamlLines) {
            if ($line -match "^sdk-version:\s*") {
                $newYamlLines += "sdk-version: 3.4.9"
            } elseif ($line -match "^build-options:") {
                $buildOptionsFound = $true
                $newYamlLines += $line
            } elseif ($buildOptionsFound -and $line -match "^\s*-\s*--target=") {
                $newYamlLines += "  - --target=$targetLF"
                $buildOptionsFound = $false
            } elseif ($buildOptionsFound -and $line -match "^\s*-") {
                # Keep other build options
                $newYamlLines += $line
            } else {
                $newYamlLines += $line
            }
        }
        
        # Add build-options if not found
        if (-not ($newYamlLines -match "build-options")) {
            $newYamlLines += ""
            $newYamlLines += "build-options:"
            $newYamlLines += "  - --target=$targetLF"
        }
        
        # Write updated YAML
        $newYamlLines | Out-File -FilePath $yamlPath -Encoding UTF8
        
        Write-Host "Updated daml.yaml:" -ForegroundColor Cyan
        Get-Content $yamlPath | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        Write-Host ""
        
        # Build
        Write-Host "Building..." -ForegroundColor Cyan
        $buildOutput = dpm build 2>&1 | Out-String
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Build successful!" -ForegroundColor Green
            
            # Find DAR file
            $darFiles = Get-ChildItem -Path ".daml\dist" -Filter "*.dar" -ErrorAction SilentlyContinue
            if ($darFiles) {
                foreach ($dar in $darFiles) {
                    Write-Host "  DAR: $($dar.Name)" -ForegroundColor Gray
                    $builtPackages += @{
                        Name = $packageName
                        Path = $dar.FullName
                    }
                }
            }
        } else {
            Write-Host "❌ Build failed" -ForegroundColor Red
            Write-Host $buildOutput.Substring(0, [Math]::Min(500, $buildOutput.Length)) -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        # Restore backup if build failed
        if (Test-Path "$yamlPath.backup") {
            if ($LASTEXITCODE -ne 0) {
                Move-Item "$yamlPath.backup" $yamlPath -Force
            } else {
                Remove-Item "$yamlPath.backup" -Force
            }
        }
        Pop-Location
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Copying built packages to .lib/" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Create .lib directory
if (-not (Test-Path ".lib")) {
    New-Item -ItemType Directory -Path ".lib" | Out-Null
}

$copied = 0
foreach ($pkg in $builtPackages) {
    $fileName = Split-Path $pkg.Path -Leaf
    $destPath = ".lib\$fileName"
    
    try {
        Copy-Item $pkg.Path $destPath -Force
        Write-Host "✅ Copied: $fileName" -ForegroundColor Green
        $copied++
    } catch {
        Write-Host "❌ Failed to copy: $fileName" -ForegroundColor Red
    }
}

Write-Host ""
if ($copied -gt 0) {
    Write-Host "Successfully built and copied $copied packages!" -ForegroundColor Green
} else {
    Write-Host "No packages were built successfully" -ForegroundColor Red
}

Read-Host "Press Enter to exit"

