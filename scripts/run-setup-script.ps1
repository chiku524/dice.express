# PowerShell script to run the DAML Setup script
# This will create TokenBalance and MarketConfig contracts on Canton

param(
    [string]$Username = "nico.builds@outlook.com",
    [string]$Password = "",
    [string]$DarFile = ".daml\dist\prediction-markets-1.0.0.dar",
    [string]$TokenFile = "token.json",
    [string]$LedgerHost = "participant.dev.canton.wolfedgelabs.com",
    [int]$LedgerPort = 443
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Run DAML Setup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if DAR file exists
if (-not (Test-Path $DarFile)) {
    Write-Host "ERROR: DAR file not found: $DarFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please build the project first:" -ForegroundColor Yellow
    Write-Host "  daml build" -ForegroundColor Yellow
    exit 1
}

# Get authentication token if password provided
if ($Password) {
    Write-Host "--- Step 1: Getting Authentication Token ---" -ForegroundColor Yellow
    Write-Host ""
    & ".\scripts\get-keycloak-token.ps1" -Username $Username -Password $Password -TokenFile $TokenFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Token acquisition failed, but continuing..." -ForegroundColor Yellow
    }
    Write-Host ""
}

# Check if daml command is available
Write-Host "--- Step 2: Checking DAML SDK ---" -ForegroundColor Yellow
Write-Host ""
try {
    $damlVersion = & daml version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "DAML SDK found: $damlVersion" -ForegroundColor Green
    } else {
        Write-Host "WARNING: 'daml' command not found in PATH" -ForegroundColor Yellow
        Write-Host "You may need to:" -ForegroundColor Yellow
        Write-Host "  1. Open a new terminal (PATH may not be updated)" -ForegroundColor Yellow
        Write-Host "  2. Or use full path to daml.exe" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Trying to find daml.exe..." -ForegroundColor Yellow
        
        # Try to find daml.exe in common locations
        $damlPaths = @(
            "$env:USERPROFILE\AppData\Roaming\daml\bin\daml.exe",
            "$env:LOCALAPPDATA\daml\bin\daml.exe",
            "C:\daml\bin\daml.exe"
        )
        
        $damlFound = $false
        foreach ($path in $damlPaths) {
            if (Test-Path $path) {
                Write-Host "Found daml.exe at: $path" -ForegroundColor Green
                $env:PATH = "$(Split-Path $path);$env:PATH"
                $damlFound = $true
                break
            }
        }
        
        if (-not $damlFound) {
            Write-Host "ERROR: Could not find daml.exe" -ForegroundColor Red
            Write-Host "Please ensure DAML SDK is installed and in PATH" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "ERROR: Could not check DAML SDK: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Build the command
Write-Host "--- Step 3: Running Setup Script ---" -ForegroundColor Yellow
Write-Host ""

$scriptArgs = @(
    "script",
    "--dar", $DarFile,
    "--script-name", "Setup:setup",
    "--ledger-host", $LedgerHost,
    "--ledger-port", $LedgerPort.ToString()
)

# Add token if file exists
if (Test-Path $TokenFile) {
    $tokenData = Get-Content $TokenFile -Raw | ConvertFrom-Json
    if ($tokenData.access_token) {
        Write-Host "Using authentication token from $TokenFile" -ForegroundColor Green
        $scriptArgs += "--access-token-file"
        $scriptArgs += $TokenFile
    }
}

Write-Host "Command: daml $($scriptArgs -join ' ')" -ForegroundColor Cyan
Write-Host ""

try {
    & daml $scriptArgs
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "Setup Script Completed Successfully!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Contracts created:" -ForegroundColor Green
        Write-Host "  - TokenBalance (stablecoin)" -ForegroundColor Green
        Write-Host "  - MarketConfig" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now test market creation from the frontend!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Red
        Write-Host "Setup Script Failed" -ForegroundColor Red
        Write-Host "==========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "  1. Party allocation failed" -ForegroundColor Yellow
        Write-Host "  2. Network connectivity" -ForegroundColor Yellow
        Write-Host "  3. Authentication token invalid" -ForegroundColor Yellow
        Write-Host "  4. DAR file not compatible" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Check the error message above for details." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to run setup script: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

