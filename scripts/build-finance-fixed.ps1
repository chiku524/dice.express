# Fixed script to build DA.Finance packages with LF 2.1
# Handles dependencies correctly by copying built packages to expected locations

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Build DA.Finance Packages with LF 2.1" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$financeDir = "daml-finance-source"
$targetLF = "2.1"
$libDir = ".lib"

# Packages in dependency order (must build dependencies first)
$packages = @(
    @{
        Name = "Daml.Finance.Interface.Types.Common.V3"
        Version = "3.0.0"
        Dependencies = @()
    },
    @{
        Name = "Daml.Finance.Interface.Util.V3"
        Version = "3.0.0"
        Dependencies = @("Daml.Finance.Interface.Types.Common.V3")
    },
    @{
        Name = "Daml.Finance.Interface.Holding.V4"
        Version = "4.0.0"
        Dependencies = @("Daml.Finance.Interface.Types.Common.V3", "Daml.Finance.Interface.Util.V3")
    },
    @{
        Name = "Daml.Finance.Interface.Account.V4"
        Version = "4.0.0"
        Dependencies = @("Daml.Finance.Interface.Holding.V4", "Daml.Finance.Interface.Types.Common.V3", "Daml.Finance.Interface.Util.V3")
    },
    @{
        Name = "Daml.Finance.Interface.Settlement.V4"
        Version = "4.0.0"
        Dependencies = @("Daml.Finance.Interface.Holding.V4", "Daml.Finance.Interface.Types.Common.V3", "Daml.Finance.Interface.Util.V3")
    },
    @{
        Name = "Daml.Finance.Interface.Instrument.Token.V4"
        Version = "4.0.0"
        Dependencies = @("Daml.Finance.Interface.Instrument.Base.V4", "Daml.Finance.Interface.Types.Common.V3", "Daml.Finance.Interface.Util.V3")
    }
)

# Check if Instrument.Base is needed
$instrumentBaseNeeded = $packages | Where-Object { $_.Dependencies -contains "Daml.Finance.Interface.Instrument.Base.V4" }
if ($instrumentBaseNeeded) {
    # Add Instrument.Base before Token
    $baseIndex = $packages.Count - 1
    $packages = $packages[0..($baseIndex-1)] + @(@{
        Name = "Daml.Finance.Interface.Instrument.Base.V4"
        Version = "4.0.0"
        Dependencies = @("Daml.Finance.Interface.Types.Common.V3", "Daml.Finance.Interface.Util.V3")
    }) + $packages[$baseIndex..($packages.Count-1)]
}

if (-not (Test-Path $financeDir)) {
    Write-Host "ERROR: DA.Finance source not found" -ForegroundColor Red
    exit 1
}

# Create .lib structure
if (-not (Test-Path $libDir)) {
    New-Item -ItemType Directory -Path $libDir | Out-Null
}

$builtPackages = @{}

foreach ($pkg in $packages) {
    $packageName = $pkg.Name
    $packageVersion = $pkg.Version
    $packageDir = Join-Path $financeDir "package\main\daml\$packageName"
    
    if (-not (Test-Path $packageDir)) {
        Write-Host "[SKIP] $packageName - directory not found" -ForegroundColor Yellow
        continue
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host "Building: $packageName ($packageVersion)" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location $packageDir
    
    try {
        $yamlPath = "daml.yaml"
        if (-not (Test-Path $yamlPath)) {
            Write-Host "[SKIP] No daml.yaml found" -ForegroundColor Yellow
            Pop-Location
            continue
        }
        
        # Read YAML as lines to preserve structure (remove BOM if present)
        $yamlContent = [System.IO.File]::ReadAllText((Resolve-Path $yamlPath), [System.Text.Encoding]::UTF8)
        # Remove BOM if present
        if ($yamlContent.StartsWith([char]0xFEFF)) {
            $yamlContent = $yamlContent.Substring(1)
        }
        $yamlLines = $yamlContent -split "`r?`n"
        
        # Backup original
        Copy-Item $yamlPath "$yamlPath.backup" -Force
        
        # Update SDK version and build-options
        $newYamlLines = @()
        $buildOptionsFound = $false
        $inBuildOptions = $false
        
        foreach ($line in $yamlLines) {
            if ($line -match "^sdk-version:\s*") {
                $newYamlLines += "sdk-version: 3.4.9"
            } elseif ($line -match "^build-options:") {
                $inBuildOptions = $true
                $newYamlLines += $line
            } elseif ($inBuildOptions -and $line -match "^\s*-\s*--target=") {
                $newYamlLines += "  - --target=$targetLF"
            } elseif ($inBuildOptions -and $line -match "^\s*-") {
                # Keep other build options
                $newYamlLines += $line
            } elseif ($inBuildOptions -and $line -match "^\S") {
                # End of build-options section
                $inBuildOptions = $false
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
        
        # Write updated YAML (UTF8 without BOM)
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllLines((Resolve-Path $yamlPath), $newYamlLines, $utf8NoBom)
        
        Write-Host "Updated daml.yaml with SDK 3.4.9 and --target=$targetLF" -ForegroundColor Cyan
        Write-Host ""
        
        # Build
        Write-Host "Building..." -ForegroundColor Cyan
        $buildOutput = dpm build 2>&1 | Out-String
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Build successful!" -ForegroundColor Green
            
            # Find DAR file
            $darFiles = Get-ChildItem -Path ".daml\dist" -Filter "*.dar" -ErrorAction SilentlyContinue
            if ($darFiles) {
                $darFile = $darFiles[0]
                Write-Host "  DAR: $($darFile.Name)" -ForegroundColor Gray
                
                # Get project root directory (where we started)
                $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
                $projectRoot = Split-Path -Parent $scriptDir
                
                # Copy to expected location in project root's .lib/daml-finance/
                $destDir = Join-Path $projectRoot $libDir | Join-Path -ChildPath "daml-finance" | Join-Path -ChildPath $packageName | Join-Path -ChildPath $packageVersion
                if (-not (Test-Path $destDir)) {
                    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                }
                
                $destPath = Join-Path $destDir $darFile.Name
                Copy-Item $darFile.FullName $destPath -Force
                Write-Host "  ✅ Copied to: $destPath" -ForegroundColor Green
                
                # Copy to all package directories that might need this dependency
                # Find all packages that depend on this one
                $dependentPackages = $packages | Where-Object { $_.Dependencies -contains $packageName }
                foreach ($depPkg in $dependentPackages) {
                    $depPkgDir = Join-Path $projectRoot $financeDir | Join-Path -ChildPath "package\main\daml" | Join-Path -ChildPath $depPkg.Name
                    if (Test-Path $depPkgDir) {
                        $depPkgLibDir = Join-Path $depPkgDir ".lib" | Join-Path -ChildPath "daml-finance" | Join-Path -ChildPath $packageName | Join-Path -ChildPath $packageVersion
                        if (-not (Test-Path $depPkgLibDir)) {
                            New-Item -ItemType Directory -Path $depPkgLibDir -Force | Out-Null
                        }
                        $depPkgDestPath = Join-Path $depPkgLibDir $darFile.Name
                        Copy-Item $darFile.FullName $depPkgDestPath -Force
                        Write-Host "  ✅ Copied to $($depPkg.Name) .lib: $depPkgDestPath" -ForegroundColor Green
                    }
                }
                
                # Also copy to project root .lib/ for backward compatibility
                $rootLibDir = Join-Path $projectRoot $libDir
                if (-not (Test-Path $rootLibDir)) {
                    New-Item -ItemType Directory -Path $rootLibDir -Force | Out-Null
                }
                $rootDestPath = Join-Path $rootLibDir $darFile.Name
                Copy-Item $darFile.FullName $rootDestPath -Force
                Write-Host "  ✅ Also copied to root .lib: $rootDestPath" -ForegroundColor Green
                
                $builtPackages[$packageName] = @{
                    Path = $destPath
                    RootPath = $rootDestPath
                    Version = $packageVersion
                }
            } else {
                Write-Host "⚠️  No DAR file found in .daml\dist" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Build failed" -ForegroundColor Red
            $errorMsg = $buildOutput.Substring(0, [Math]::Min(600, $buildOutput.Length))
            Write-Host $errorMsg -ForegroundColor Red
            
            # Restore backup
            if (Test-Path "$yamlPath.backup") {
                Move-Item "$yamlPath.backup" $yamlPath -Force
            }
            Pop-Location
            continue
        }
        
        # Remove backup on success
        if (Test-Path "$yamlPath.backup") {
            Remove-Item "$yamlPath.backup" -Force
        }
        
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if (Test-Path "$yamlPath.backup") {
            Move-Item "$yamlPath.backup" $yamlPath -Force
        }
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Build Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($builtPackages.Count -gt 0) {
    Write-Host "Successfully built $($builtPackages.Count) packages:" -ForegroundColor Green
    foreach ($pkgName in $builtPackages.Keys) {
        Write-Host "  ✅ $pkgName" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "Packages are available in:" -ForegroundColor Cyan
    Write-Host "  - .lib/daml-finance/{PackageName}/{Version}/" -ForegroundColor Gray
    Write-Host "  - .lib/ (root, for backward compatibility)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next step: Try building the main project:" -ForegroundColor Cyan
    Write-Host "  dpm build" -ForegroundColor Yellow
} else {
    Write-Host "No packages were built successfully" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"

