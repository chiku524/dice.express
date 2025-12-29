# Extract access token from token.json to token.txt for DAML Script
param(
    [string]$TokenFile = "token.json",
    [string]$OutputFile = "token.txt"
)

$ErrorActionPreference = "Stop"

try {
    $tokenData = Get-Content $TokenFile -Raw | ConvertFrom-Json
    if ($tokenData.access_token) {
        $tokenData.access_token | Out-File -FilePath $OutputFile -Encoding ASCII -NoNewline
        Write-Host "Token extracted to $OutputFile" -ForegroundColor Green
    } else {
        Write-Host "ERROR: No access_token found in $TokenFile" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Failed to extract token: $_" -ForegroundColor Red
    exit 1
}

