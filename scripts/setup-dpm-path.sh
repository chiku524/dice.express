#!/bin/bash
# Add dpm to PATH for Git Bash

DPM_PATH="/c/Users/chiku/AppData/Roaming/dpm/cache/components/dpm/1.0.4"

# Add to current session
export PATH="$PATH:$DPM_PATH"

# Verify
if command -v dpm &> /dev/null; then
    echo "dpm is now available in this session"
    dpm --version
else
    echo "dpm not found. Please check the path: $DPM_PATH"
fi

