# Get Keycloak access token for Canton devnet
# Uses Client ID "Prediction-Market"

param(
    [string]$Username,
    [string]$Password,
    [string]$ClientId = "Prediction-Market"
)

$ErrorActionPreference = "Stop"

$KeycloakUrl = "https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token"

# Get credentials if not provided
if (-not $Username) {
    $Username = Read-Host "Enter your Keycloak username"
}

if (-not $Password) {
    $SecurePassword = Read-Host "Enter your Keycloak password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

Write-Host "Requesting token from Keycloak..." -ForegroundColor Cyan
Write-Host "Client ID: $ClientId" -ForegroundColor Gray

try {
    $body = @{
        client_id = $ClientId
        username = $Username
        password = $Password
        grant_type = "password"
    }
    
    $response = Invoke-RestMethod -Uri $KeycloakUrl -Method Post -Body $body -ErrorAction Stop
    
    if ($response.access_token) {
        $response | ConvertTo-Json | Out-File -FilePath "token.json" -Encoding UTF8
        Write-Host "Token saved to token.json" -ForegroundColor Green
        Write-Host "Token (first 50 chars): $($response.access_token.Substring(0, [Math]::Min(50, $response.access_token.Length)))..." -ForegroundColor Gray
        # Exit with success code (don't return token to avoid printing it)
        exit 0
    } else {
        Write-Host "ERROR: No access_token in response" -ForegroundColor Red
        Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "ERROR: Failed to get token" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    exit 1
}

