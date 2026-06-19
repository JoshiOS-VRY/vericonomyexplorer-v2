#!/usr/bin/env bash
set -euo pipefail
# Production deploy wrapper — see deploy/option-a/deploy-prod.sh and STAGING.md
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy-prod.sh" "$@"
