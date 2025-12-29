# Codebase Cleanup Plan

## Files to Remove

### Redundant Documentation (Consolidate into main guides)
1. **Build-related docs** (keep only BUILD_SUCCESS.md):
   - BUILD_STATUS.md
   - BUILD_SUCCESS_SUMMARY.md
   - BUILD_PROGRESS_SUMMARY.md
   - BUILD_TESTING_PROGRESS.md
   - BUILD_TESTING_FINAL_SUMMARY.md
   - COMPREHENSIVE_BUILD_TESTING.md
   - BUILD_TARGET_2.1_TEST.md
   - OLDER_SDK_TESTING_SUMMARY.md

2. **Deployment docs** (keep only DEPLOYMENT_SUCCESS_FINAL.md):
   - DEPLOYMENT_SUCCESS.md
   - DEPLOYMENT_READY.md
   - DEPLOYMENT_INSTRUCTIONS.md
   - DEPLOYMENT_WITH_CLIENT_ID.md
   - DEPLOYMENT_AUTH.md

3. **Token/Auth docs** (keep only CLIENT_AUTHENTICATION_ISSUE.md):
   - TOKEN_AUTHENTICATION_ISSUE.md
   - TOKEN_LIFETIME_ISSUE.md
   - JSON_API_AUTH_ISSUE_SUMMARY.md
   - FRESH_TOKEN_TEST_RESULTS.md

4. **Client communication** (keep only CLIENT_AUTHENTICATION_ISSUE.md):
   - CLIENT_RESPONSE_FINAL.md
   - CLIENT_RESPONSE_SUMMARY.md
   - CLIENT_ACKNOWLEDGMENT.md
   - CLIENT_BUILD_TARGET_RESPONSE.md

5. **Testing docs** (keep only WORKFLOW_GUIDE.md):
   - TESTING_SUMMARY.md
   - TESTING_CONTRACT_CREATION.md
   - CONTRACT_CREATION_TEST_RESULTS.md
   - CONTRACT_CREATION_TEST.md
   - TEST_CONTRACT_VERIFICATION.md

6. **Redundant guides**:
   - ENDPOINT_CLARIFICATION.md (info in CANTON_ENDPOINTS_UPDATE.md)
   - CANTON_RESEARCH_FINDINGS.md (info in RESEARCH_SUMMARY.md)
   - TROUBLESHOOTING_415_ERROR.md (resolved)
   - NEXT_STEPS_SUMMARY.md (outdated)
   - ACTION_PLAN.md (outdated)
   - IMPORT_FIXES_SUMMARY.md (historical)
   - DAML_YAML_FILES.md (historical)
   - CLEANUP_ROUND_2.md (historical)
   - CLEANUP_SUMMARY.md (historical)

### Redundant Scripts
1. **Old build scripts** (keep only unified-setup.ps1):
   - build-finance-fixed.ps1
   - build-finance-from-source.ps1
   - build-finance-simple.ps1
   - test-all-build-approaches.ps1
   - test-older-sdks-direct.ps1
   - test-older-sdks-with-daml.ps1
   - test-sdk-2.10.0-manual.ps1
   - test-sdk-versions.ps1
   - test-sdk-with-env.ps1

2. **Old .bat files** (keep PowerShell versions):
   - All .bat files in scripts/ (use .ps1 versions instead)

3. **Redundant test scripts**:
   - create-token-balance.js (functionality in setup-via-json-api.js)
   - create-market-config.js (functionality in setup-via-json-api.js)
   - verify-package.js (functionality in verify-canton-capabilities.js)

### Temporary Files
- token.json (should be in .gitignore)
- token.txt (should be in .gitignore)
- token-response.json (if exists)

## Files to Keep

### Essential Documentation
- README.md
- QUICK_START.md
- WORKFLOW_GUIDE.md
- CANTON_JSON_API_GUIDE.md
- CONTRACT_CREATION_TOOLS.md
- VERSION_COMPATIBILITY.md
- SETUP_SCRIPTS_GUIDE.md
- CLIENT_AUTHENTICATION_ISSUE.md
- RESEARCH_SUMMARY.md
- CANTON_ENDPOINTS_UPDATE.md
- DEPLOYMENT_SUCCESS_FINAL.md
- BUILD_SUCCESS.md
- TOKEN_STANDARD_MIGRATION_COMPLETE.md
- DAML_SCRIPT_TEST_RESULTS.md
- SDK_VERSION_ISSUE.md
- Architecture/Design docs (AMM_*, ARCHITECTURE.md, API.md, ORACLE_SETUP.md, ENHANCEMENTS.md)

### Essential Scripts
- get-keycloak-token.ps1
- extract-token.ps1
- deploy-via-grpc-admin.ps1
- setup-via-json-api.js
- unified-setup.ps1
- run-setup-json-api.ps1
- run-setup-script.ps1
- switch-sdk-version.ps1
- verify-token.js
- verify-canton-capabilities.js
- check-compatibility.js
- test-fresh-token.ps1
- test-json-api-auth.js (new)
- test-token-auth.js

