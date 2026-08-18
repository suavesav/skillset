#!/usr/bin/env bash
# Validate the skillset library. Thin wrapper around scripts/validate.py.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v python3 >/dev/null 2>&1 || { echo "python3 is required" >&2; exit 1; }
exec python3 scripts/validate.py "$@"
