#!/bin/bash
# Quick script to use SAT locally without npm link
# Usage: source use-sat.sh or . ./use-sat.sh

export PATH="$(cd "$(dirname "$0")" && pwd)/bin:$PATH"
echo "SAT is now available. Use 'sat' command."

