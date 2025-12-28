# Download DA.Finance packages for DPM/SDK 3.4.9
# These should be the correct v4 packages compatible with LF 1.17

$libDir = ".lib"
if (-not (Test-Path $libDir)) {
    New-Item -ItemType Directory -Path $libDir -Force | Out-Null
}

$packages = @(
    @{Name = "daml-finance-interface-account.dar"; Url = "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Account.V4/4.0.0/daml-finance-interface-account-v4-4.0.0.dar"},
    @{Name = "daml-finance-interface-holding.dar"; Url = "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Holding.V4/4.0.0/daml-finance-interface-holding-v4-4.0.0.dar"},
    @{Name = "daml-finance-interface-settlement.dar"; Url = "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Settlement.V4/4.0.0/daml-finance-interface-settlement-v4-4.0.0.dar"},
    @{Name = "daml-finance-interface-types-common.dar"; Url = "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Types.Common.V3/3.0.0/daml-finance-interface-types-common-v3-3.0.0.dar"},
    @{Name = "daml-finance-interface-instrument-token.dar"; Url = "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Instrument.Token.V4/4.0.0/daml-finance-interface-instrument-token-v4-4.0.0.dar"},
    @{Name = "daml-finance-interface-util.dar"; Url = "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Util.V3/3.3.0/daml-finance-interface-util-v3-3.0.0.dar"}
)

Write-Host "Downloading DA.Finance packages for SDK 3.4.9..." -ForegroundColor Green
Write-Host ""

foreach ($pkg in $packages) {
    $dest = Join-Path $libDir $pkg.Name
    Write-Host "Downloading $($pkg.Name)..." -NoNewline
    try {
        Invoke-WebRequest -Uri $pkg.Url -OutFile $dest -UseBasicParsing -ErrorAction Stop
        $size = (Get-Item $dest).Length / 1KB
        Write-Host " OK ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
    } catch {
        Write-Host " Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Download complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: If packages are still LF version 1, you may need to:" -ForegroundColor Yellow
Write-Host "1. Contact DAML support for correct package sources" -ForegroundColor Yellow
Write-Host "2. Or manually download packages from browser" -ForegroundColor Yellow

