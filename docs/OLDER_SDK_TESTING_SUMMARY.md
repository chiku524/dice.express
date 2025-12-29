# Older SDK Testing Summary

## Status

Testing older SDK versions (2.8.0, 2.10.0, 2.10.2) to see if they're compatible with the LF 1 DA.Finance packages we have.

## Challenges Encountered

### 1. `daml` Command Wrapper
- The `daml` command always uses the latest SDK (3.4.9)
- Even when `daml.yaml` specifies SDK 2.10.0, `daml build` uses SDK 3.4.9
- Error: "SDK 3.4.9 has been released!"

### 2. Direct `damlc` Usage
- Found SDK-specific `damlc.exe` at: `C:\Users\chiku\AppData\Roaming\daml\sdk\{version}\damlc\damlc.exe`
- However, `damlc` can't resolve SDK dependencies like `daml-script`
- Error: "Cannot resolve SDK dependency 'daml-script'. Use daml assistant."

### 3. SDK Environment Setup
- SDKs are installed but the environment isn't set up correctly for older SDKs
- Need to use the SDK's build system or assistant properly

## Next Steps

1. **Check LF Version of Packages**: Verify what LF version the packages in `.lib/` actually are
2. **Try SDK 2.10.0 with Proper Environment**: Set up the SDK 2.10.0 environment correctly
3. **Alternative**: Continue with building DA.Finance from source with LF 2.1

## Hypothesis

If the packages in `.lib/` are LF 1.15 or earlier, they should work with SDK 2.10.0/2.10.2 (which use LF 1.15).
If they're LF 1.17, they won't work with older SDKs and we need to build from source.

