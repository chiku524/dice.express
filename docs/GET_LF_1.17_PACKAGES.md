# Getting LF 1.17 Packages for SDK 3.4.9

## The Problem

The packages in `.lib/` are **LF version 1** (348KB files), not **LF 1.17**. SDK 3.4.9 cannot read LF version 1 packages, hence the error:
```
Protobuf error: "ParseError \"Lf1 is not supported\""
```

## Solution: Get Correct LF 1.17 Packages

We need to replace the packages in `.lib/` with LF 1.17 compatible packages.

### Option 1: Use the Script (Recommended)

Run the script that creates quickstart-finance outside the project and copies packages:

```cmd
.\scripts\get-lf-1.17-packages.bat
```

This script will:
1. Create `quickstart-finance-temp` in the parent directory
2. Download dependencies (which will be LF 1.17 for SDK 3.4.9)
3. Copy the packages to your project's `.lib/` directory
4. Clean up the temporary project

### Option 2: Manual Steps

**Step 1: Create quickstart-finance outside the project**

```cmd
cd ..
daml new quickstart-finance-temp --template=quickstart-finance
cd quickstart-finance-temp
```

**Step 2: Download dependencies**

```cmd
get-dependencies.bat
```

**Step 3: Copy packages to your project**

```cmd
copy .lib\daml-finance-interface-account.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-holding.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-settlement.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-types-common.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-instrument-token.dar ..\upwork-canton-daml-project\.lib\
copy .lib\daml-finance-interface-util.dar ..\upwork-canton-daml-project\.lib\
```

**Step 4: Go back to your project**

```cmd
cd ..\upwork-canton-daml-project
```

**Step 5: Clean up**

```cmd
cd ..
rmdir /s /q quickstart-finance-temp
cd upwork-canton-daml-project
```

## Verify Packages

After copying, check the file sizes. LF 1.17 packages should be:
- Similar or larger than 348KB (they may be the same size, but the LF version inside is different)
- The key is they'll be downloaded by quickstart-finance with SDK 3.4.9, which ensures LF 1.17

## After Getting Correct Packages

1. **Build the project:**
   ```cmd
   daml build
   ```

2. **If build succeeds, deploy:**
   ```cmd
   .\scripts\deploy-only.bat
   ```

## Why This Works

- Quickstart-finance template uses the SDK version from `daml.yaml` (3.4.9)
- When it downloads packages, they'll be LF 1.17 compatible
- Copying them to your project ensures you have the correct versions

## Troubleshooting

### Script fails to create quickstart-finance

- Make sure you're in the project directory when running the script
- Check that `daml` command works
- Verify SDK 3.4.9 is installed: `daml install 3.4.9`

### Packages still show "Lf1 is not supported"

- Make sure you're using SDK 3.4.9 when running quickstart-finance
- Check that `daml.yaml` in quickstart-finance shows `sdk-version: 3.4.9`
- Try cleaning build cache: `rmdir /s /q .daml` then rebuild

### File sizes are the same

- File sizes may be similar, but the LF version inside is different
- The important thing is they were downloaded by quickstart-finance with SDK 3.4.9
- Try building - if it works, the packages are correct

