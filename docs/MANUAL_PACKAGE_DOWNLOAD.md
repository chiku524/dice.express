# Manual Package Download Instructions

## Current Situation

The script created `quickstart-finance-temp` but didn't complete the download/copy steps. Let's complete it manually.

## Manual Steps

### Step 1: Navigate to quickstart-finance-temp

```cmd
cd ..
cd quickstart-finance-temp
```

### Step 2: Download Dependencies

```cmd
get-dependencies.bat
```

Wait for it to complete. You should see packages downloading to `.lib/` directory.

### Step 3: Verify Packages Downloaded

```cmd
dir .lib\daml-finance-interface-*.dar
```

You should see files like:
- daml-finance-interface-account.dar
- daml-finance-interface-holding.dar
- daml-finance-interface-settlement.dar
- etc.

### Step 4: Copy Packages to Your Project

```cmd
copy .lib\daml-finance-interface-account.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-holding.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-settlement.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-types-common.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-instrument-token.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-util.dar ..\upwork-canton-daml-project\.lib\
```

### Step 5: Go Back to Your Project

```cmd
cd ..\upwork-canton-daml-project
```

### Step 6: Verify Packages Were Copied

```cmd
dir .lib\daml-finance-interface-*.dar
```

### Step 7: Clean Up (Optional)

```cmd
cd ..
rmdir /s /q quickstart-finance-temp
cd upwork-canton-daml-project
```

### Step 8: Build

```cmd
daml build
```

## Quick Command Sequence

```cmd
REM 1. Go to quickstart-finance-temp
cd ..\quickstart-finance-temp

REM 2. Download dependencies
get-dependencies.bat

REM 3. Copy packages
copy .lib\daml-finance-interface-account.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-holding.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-settlement.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-types-common.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-instrument-token.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-util.dar ..\upwork-canton-daml-project\.lib\

REM 4. Go back
cd ..\upwork-canton-daml-project

REM 5. Build
daml build
```

## Alternative: Use Fixed Script

I've created a fixed version of the script with better error handling:

```cmd
.\scripts\get-lf-1.17-packages-fixed.bat
```

This should complete all steps automatically.

