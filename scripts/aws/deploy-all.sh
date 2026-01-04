#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

"$SCRIPT_DIR/deploy-auth.sh"
"$SCRIPT_DIR/deploy-core.sh"
"$SCRIPT_DIR/deploy-data.sh"

if [[ "${SKIP_FRONTEND:-}" != "1" ]]; then
  "$SCRIPT_DIR/deploy-frontend.sh"
fi
