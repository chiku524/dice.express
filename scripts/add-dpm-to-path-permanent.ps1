# Permanently add dpm to PATH

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Adding dpm to PATH Permanently" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Find dpm.exe
$dpmPath = $null
$possiblePaths = @(
    "$env:USERPROFILE\AppData\Roaming\dpm\cache\components\dpm\1.0.4",
    "$env:LOCALAPPDATA\dpm\cache\components\dpm\1.0.4",
    "$env:USERPROFILE\go\bin",
    "$env:LOCALAPPDATA\go\bin"
)

Write-Host "Searching for dpm.exe..." -ForegroundColor Yellow

foreach ($path in $possiblePaths) {
    if (Test-Path "$path\dpm.exe") {
        $dpmPath = $path
        Write-Host "[FOUND] $path\dpm.exe" -ForegroundColor Green
        break
    }
}

# Deep search if not found
if (-not $dpmPath) {
    Write-Host "Searching deeper..." -ForegroundColor Yellow
    $found = Get-ChildItem -Path $env:USERPROFILE -Filter "dpm.exe" -Recurse -ErrorAction SilentlyContinue -Depth 5 | Select-Object -First 1
    if ($found) {
        $dpmPath = $found.DirectoryName
        Write-Host "[FOUND] $($found.FullName)" -ForegroundColor Green
    }
}

if (-not $dpmPath) {
    Write-Host ""
    Write-Host "ERROR: dpm.exe not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install DPM first or provide the path to dpm.exe" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "dpm.exe location: $dpmPath" -ForegroundColor Green
Write-Host ""

# Verify it works
Write-Host "Testing dpm..." -ForegroundColor Cyan
try {
    $version = & "$dpmPath\dpm.exe" --version 2>&1
    Write-Host "dpm version: $version" -ForegroundColor Green
} catch {
    Write-Host "WARNING: dpm.exe found but doesn't work" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Adding to User PATH..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get current user PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($currentPath -like "*$dpmPath*") {
    Write-Host "PATH already contains: $dpmPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Current PATH includes this location." -ForegroundColor Green
} else {
    # Add to PATH
    $newPath = "$currentPath;$dpmPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added to User PATH: $dpmPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "PATH updated successfully!" -ForegroundColor Green
}

# Also add to current session
$env:PATH = "$env:PATH;$dpmPath"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Verifying dpm command..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test if dpm is now available
try {
    $version = dpm --version 2>&1
    Write-Host "SUCCESS! dpm is now available:" -ForegroundColor Green
    Write-Host $version -ForegroundColor Green
    Write-Host ""
    Write-Host "You may need to restart your terminal for the change to take full effect." -ForegroundColor Yellow
} catch {
    Write-Host ""
    Write-Host "dpm command not yet recognized in this session." -ForegroundColor Yellow
    Write-Host "Please restart your terminal, or use the full path: $dpmPath\dpm.exe" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The PATH has been updated permanently, so it will work in new terminals." -ForegroundColor Green
}

Write-Host ""
Read-Host "Press Enter to exit"

