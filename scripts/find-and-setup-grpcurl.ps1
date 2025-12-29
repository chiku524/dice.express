# Find grpcurl.exe and help set up PATH

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Searching for grpcurl.exe..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$found = $false
$grpcurlPath = $null

# Check common Go locations
$locations = @(
    "$env:USERPROFILE\go\bin",
    "$env:LOCALAPPDATA\go\bin",
    "$env:GOPATH\bin",
    "$env:USERPROFILE\Downloads",
    "$env:USERPROFILE\Desktop",
    "$PWD",
    "C:\tools",
    "C:\Windows\System32"
)

foreach ($location in $locations) {
    if (Test-Path "$location\grpcurl.exe") {
        $fullPath = "$location\grpcurl.exe"
        Write-Host "[FOUND] $fullPath" -ForegroundColor Green
        $grpcurlPath = $location
        $found = $true
        break
    }
}

# Deep search if not found
if (-not $found) {
    Write-Host "Searching deeper..." -ForegroundColor Yellow
    $results = Get-ChildItem -Path $env:USERPROFILE -Filter "grpcurl.exe" -Recurse -ErrorAction SilentlyContinue -Depth 4 | Select-Object -First 3
    
    if ($results) {
        foreach ($result in $results) {
            Write-Host "[FOUND] $($result.FullName)" -ForegroundColor Green
            $grpcurlPath = $result.DirectoryName
            $found = $true
            break
        }
    }
}

if (-not $found) {
    Write-Host ""
    Write-Host "grpcurl.exe not found in common locations." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "  1. Find where you downloaded/extracted grpcurl.exe"
    Write-Host "  2. Note the full path"
    Write-Host "  3. We'll add it to PATH"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Found grpcurl.exe!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Location: $grpcurlPath" -ForegroundColor Yellow
Write-Host ""

# Verify it works
Write-Host "Testing grpcurl..." -ForegroundColor Cyan
try {
    $version = & "$grpcurlPath\grpcurl.exe" --version 2>&1
    Write-Host $version -ForegroundColor Green
} catch {
    Write-Host "ERROR: grpcurl.exe found but doesn't work" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setting up PATH..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Add to current session PATH
$env:PATH = "$env:PATH;$grpcurlPath"
Write-Host "Added to PATH for this session: $grpcurlPath" -ForegroundColor Green
Write-Host ""

# Ask to add permanently
$addPermanent = Read-Host "Do you want to add this to your system PATH permanently? (Y/N)"

if ($addPermanent -eq "Y" -or $addPermanent -eq "y") {
    Write-Host ""
    Write-Host "Adding to user PATH..." -ForegroundColor Cyan
    
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($currentPath -notlike "*$grpcurlPath*") {
        $newPath = "$currentPath;$grpcurlPath"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "PATH updated permanently!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You may need to restart your terminal for the change to take effect." -ForegroundColor Yellow
    } else {
        Write-Host "PATH already contains this location." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "PATH not updated permanently." -ForegroundColor Yellow
    Write-Host "You can add it manually or run this script again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Testing grpcurl command..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

try {
    $version = grpcurl --version 2>&1
    Write-Host $version -ForegroundColor Green
    Write-Host ""
    Write-Host "SUCCESS! grpcurl is now available." -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "Command still not recognized. You may need to:" -ForegroundColor Yellow
    Write-Host "  1. Restart your terminal" -ForegroundColor Yellow
    Write-Host "  2. Or use the full path: $grpcurlPath\grpcurl.exe" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"

