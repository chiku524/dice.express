# Build DA.Finance packages from source with LF 2.1 target

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Build DA.Finance from Source" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$financeDir = "daml-finance-source"
$targetLF = "2.1"

if (-not (Test-Path $financeDir)) {
    Write-Host "ERROR: DA.Finance source not found at: $financeDir" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run first:" -ForegroundColor Yellow
    Write-Host "  scripts\download-daml-finance-source.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "Source directory: $financeDir" -ForegroundColor Green
Write-Host "Target LF version: $targetLF" -ForegroundColor Green
Write-Host ""

# Check if dpm/daml is available
try {
    $dpmVersion = dpm --version 2>&1
    Write-Host "Using: dpm $dpmVersion" -ForegroundColor Green
    $buildCmd = "dpm"
} catch {
    try {
        $damlVersion = daml version 2>&1
        Write-Host "Using: daml $damlVersion" -ForegroundColor Green
        $buildCmd = "daml"
    } catch {
        Write-Host "ERROR: Neither dpm nor daml is available" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Finding DA.Finance packages to build" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Find all daml.yaml files in the repository
$packageDirs = Get-ChildItem -Path $financeDir -Filter "daml.yaml" -Recurse -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty DirectoryName | 
    Select-Object -Unique

Write-Host "Found $($packageDirs.Count) packages:" -ForegroundColor Green
foreach ($dir in $packageDirs) {
    $relativePath = $dir.Replace((Get-Location).Path + "\", "")
    Write-Host "  - $relativePath" -ForegroundColor Gray
}

Write-Host ""
Write-Host "We need to build these specific packages:" -ForegroundColor Cyan
Write-Host "  - Interface.Account" -ForegroundColor Yellow
Write-Host "  - Interface.Holding" -ForegroundColor Yellow
Write-Host "  - Interface.Settlement" -ForegroundColor Yellow
Write-Host "  - Interface.Types.Common" -ForegroundColor Yellow
Write-Host "  - Interface.Instrument.Token" -ForegroundColor Yellow
Write-Host "  - Interface.Util" -ForegroundColor Yellow
Write-Host ""

# Find the specific packages we need
$packagesToBuild = @(
    "Interface.Account",
    "Interface.Holding",
    "Interface.Settlement",
    "Interface.Types.Common",
    "Interface.Instrument.Token",
    "Interface.Util"
)

$foundPackages = @()
foreach ($package in $packagesToBuild) {
    $found = $packageDirs | Where-Object { $_ -like "*$package*" } | Select-Object -First 1
    if ($found) {
        $foundPackages += $found
        Write-Host "[FOUND] $package at: $found" -ForegroundColor Green
    } else {
        Write-Host "[NOT FOUND] $package" -ForegroundColor Red
    }
}

if ($foundPackages.Count -eq 0) {
    Write-Host ""
    Write-Host "ERROR: Could not find any required packages" -ForegroundColor Red
    Write-Host "The repository structure might be different than expected" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Building packages with --target=$targetLF" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$builtPackages = @()

foreach ($packageDir in $foundPackages) {
    Write-Host ""
    Write-Host "Building: $packageDir" -ForegroundColor Yellow
    
    Push-Location $packageDir
    
    try {
        # Read daml.yaml and add build-options
        if (Test-Path "daml.yaml") {
            $yamlContent = Get-Content "daml.yaml" -Raw
            
            # Add build-options if not present
            if ($yamlContent -notlike "*build-options*") {
                $yamlContent += "`nbuild-options:`n  - --target=$targetLF"
                $yamlContent | Out-File -FilePath "daml.yaml" -Encoding UTF8 -NoNewline
            }
            
            # Build
            if ($buildCmd -eq "dpm") {
                $buildOutput = dpm build 2>&1 | Out-String
            } else {
                $buildOutput = daml build 2>&1 | Out-String
            }
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Build successful!" -ForegroundColor Green
                
                # Find the built .dar file
                $darFiles = Get-ChildItem -Path ".daml\dist" -Filter "*.dar" -ErrorAction SilentlyContinue
                if ($darFiles) {
                    foreach ($dar in $darFiles) {
                        Write-Host "  DAR: $($dar.FullName)" -ForegroundColor Gray
                        $builtPackages += $dar.FullName
                    }
                }
            } else {
                Write-Host "❌ Build failed" -ForegroundColor Red
                Write-Host $buildOutput.Substring(0, [Math]::Min(300, $buildOutput.Length)) -ForegroundColor Red
            }
        } else {
            Write-Host "⚠️  No daml.yaml found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Copying built packages to .lib/" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Create .lib directory if it doesn't exist
if (-not (Test-Path ".lib")) {
    New-Item -ItemType Directory -Path ".lib" | Out-Null
}

# Copy built packages
$copied = 0
foreach ($darFile in $builtPackages) {
    $fileName = Split-Path $darFile -Leaf
    $destPath = ".lib\$fileName"
    
    try {
        Copy-Item $darFile $destPath -Force
        Write-Host "✅ Copied: $fileName" -ForegroundColor Green
        $copied++
    } catch {
        Write-Host "❌ Failed to copy: $fileName" -ForegroundColor Red
    }
}

Write-Host ""
if ($copied -gt 0) {
    Write-Host "Successfully built and copied $copied packages!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next step: Try building the main project:" -ForegroundColor Cyan
    Write-Host "  dpm build" -ForegroundColor Yellow
} else {
    Write-Host "No packages were built successfully" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"

