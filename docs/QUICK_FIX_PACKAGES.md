# Quick Fix: Complete Package Download Manually

Since `quickstart-finance-temp` already exists outside your project folder, you can complete the process manually:

## Quick Steps

### Step 1: Navigate to quickstart-finance-temp

```cmd
cd ..\quickstart-finance-temp
```

### Step 2: Download Dependencies

```cmd
get-dependencies.bat
```

Wait for all packages to download. You should see progress bars.

### Step 3: Copy Packages to Your Project

```cmd
copy .lib\daml-finance-interface-account.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-holding.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-settlement.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-types-common.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-instrument-token.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-util.dar ..\upwork-canton-daml-project\.lib\
```

### Step 4: Go Back and Build

```cmd
cd ..\upwork-canton-daml-project
daml build
```

## One-Liner (if dependencies already downloaded)

If `get-dependencies.bat` already ran successfully in quickstart-finance-temp:

```cmd
cd ..\quickstart-finance-temp && copy .lib\daml-finance-interface-*.dar ..\upwork-canton-daml-project\.lib\ && cd ..\upwork-canton-daml-project && daml build
```

## Verify Packages Were Copied

```cmd
dir .lib\daml-finance-interface-*.dar
```

You should see 6 files with recent timestamps.

## After Build Succeeds

```cmd
.\scripts\deploy-only.bat
```

