# DAML YAML Files - Which One to Share?

## Two daml.yaml Files

We have **two** `daml.yaml` files in the project:

### 1. Root `daml.yaml` (Main Project)

**Location**: `daml.yaml` (project root)

**Purpose**: Main prediction markets project with full DA.Finance dependencies

**Content**:
```yaml
sdk-version: 3.4.9
name: prediction-markets
version: 1.0.0
source: daml
dependencies:
  - daml-stdlib
  - daml-script
  - daml-prim
data-dependencies:
  - .lib/daml-finance-interface-account.dar
  - .lib/daml-finance-interface-holding.dar
  - .lib/daml-finance-interface-settlement.dar
  - .lib/daml-finance-interface-types-common.dar
  - .lib/daml-finance-interface-instrument-token.dar
  - .lib/daml-finance-interface-util.dar
```

**Status**: 
- ⚠️ **Not building yet** - DA.Finance packages have LF version compatibility issues
- ⏭️ **Future deployment** - Will deploy once packages are resolved

### 2. Test Contract `daml.yaml`

**Location**: `test-contract/daml.yaml`

**Purpose**: Simple test contract **without** DA.Finance dependencies (used for deployment testing)

**Content**:
```yaml
sdk-version: 3.4.9
name: prediction-markets-test
version: 1.0.0
source: daml
dependencies:
  - daml-stdlib
  - daml-script
  - daml-prim
```

**Status**:
- ✅ **Building successfully**
- ✅ **Deployed successfully** - This is what we deployed to Canton devnet
- ✅ **DAR ID**: `bda34192a28362b85eae410e41791a1205507eb48835204235c9be8eb4e7a34d`

## Which One to Share?

**Recommendation**: Share **both** and explain the difference:

1. **`test-contract/daml.yaml`** - This is what we successfully deployed
2. **`daml.yaml`** (root) - This is the main project that will be deployed once DA.Finance packages are resolved

## Explanation for Client

The test contract `daml.yaml` is simpler and doesn't have DA.Finance dependencies, which is why it builds and deploys successfully. The main project `daml.yaml` includes DA.Finance packages which are currently causing build issues due to LF version compatibility.

## Files to Share

1. ✅ `daml.yaml` (root) - Main project configuration
2. ✅ `test-contract/daml.yaml` - Test contract configuration (successfully deployed)

