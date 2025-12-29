@echo off
REM Deploy DAR file using gRPC Admin API
REM Based on Canton gRPC Admin API documentation

setlocal enabledelayedexpansion

set ADMIN_API_HOST=participant.dev.canton.wolfedgelabs.com
set ADMIN_API_PORT=443
set SERVICE=com.daml.ledger.api.v1.admin.PackageManagementService/UploadDarFile
set DAR_FILE=test-contract\.daml\dist\prediction-markets-test-1.0.0.dar

echo ==========================================
echo Deploy DAR via gRPC Admin API
echo ==========================================
echo.

REM Check if grpcurl is installed
where grpcurl >nul 2>&1
if errorlevel 1 (
    echo ERROR: grpcurl is not installed or not in PATH
    echo.
    echo Please install grpcurl:
    echo   Windows: choco install grpcurl
    echo   Or download from: https://github.com/fullstorydev/grpcurl/releases
    echo.
    pause
    exit /b 1
)

REM Check DAR file
if not exist "%DAR_FILE%" (
    echo ERROR: DAR file not found: %DAR_FILE%
    echo Please build the test contract first:
    echo   cd test-contract
    echo   dpm build
    pause
    exit /b 1
)

echo DAR file: %DAR_FILE%
echo Admin API: %ADMIN_API_HOST%:%ADMIN_API_PORT%
echo Service: %SERVICE%
echo.

REM Get token if not already available
if not exist token.json (
    echo Getting authentication token...
    call scripts\get-keycloak-token.bat
    if not exist token.json (
        echo ERROR: Could not get token
        pause
        exit /b 1
    )
)

REM Extract token
for /f "delims=" %%i in ('powershell -NoProfile -Command "$json = Get-Content token.json -Raw | ConvertFrom-Json; if ($json.access_token) { Write-Output $json.access_token } else { Write-Output 'ERROR' }"') do set TOKEN=%%i

if "!TOKEN!"=="" (
    echo ERROR: Could not extract token
    pause
    exit /b 1
)

if "!TOKEN!"=="ERROR" (
    echo ERROR: No access_token in token.json
    pause
    exit /b 1
)

echo Token obtained.
echo.

REM Base64 encode DAR file
echo Base64 encoding DAR file...
powershell -NoProfile -Command "[Convert]::ToBase64String([IO.File]::ReadAllBytes('%DAR_FILE%'))" > dar_base64.txt
set /p BASE64_DAR=<dar_base64.txt

REM Generate submission ID
for /f %%i in ('powershell -Command "[guid]::NewGuid().ToString()"') do set SUBMISSION_ID=%%i

echo Submission ID: !SUBMISSION_ID!
echo.

REM Create JSON request
echo Creating gRPC request...
(
    echo {
    echo   "dar_file": "!BASE64_DAR!",
    echo   "submission_id": "!SUBMISSION_ID!"
    echo }
) > grpc_request.json

echo.
echo ==========================================
echo Uploading DAR file via gRPC...
echo ==========================================
echo.

REM Send gRPC request
REM Note: Using -insecure for HTTPS without certificate verification
REM For production, use proper TLS certificates
grpcurl -insecure ^
  -H "authorization: Bearer !TOKEN!" ^
  -d @ ^
  %ADMIN_API_HOST%:%ADMIN_API_PORT% ^
  %SERVICE% ^
  < grpc_request.json

if errorlevel 1 (
    echo.
    echo ==========================================
    echo ERROR: gRPC upload failed
    echo ==========================================
    echo.
    echo Possible issues:
    echo   1. grpcurl not installed or not in PATH
    echo   2. Network connection issue
    echo   3. Authentication token invalid
    echo   4. Admin API endpoint not accessible
    echo   5. DAR file too large (gRPC message size limit)
    echo.
    echo Note: If you get a timeout, the DAR file might be too large.
    echo The default gRPC message size limit is 4MB.
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ==========================================
    echo SUCCESS: DAR file uploaded!
    echo ==========================================
    echo.
)

REM Cleanup
del dar_base64.txt grpc_request.json 2>nul

echo Done!
pause
