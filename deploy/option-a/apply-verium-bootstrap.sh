#!/usr/bin/env bash
# Apply Verium blockchain bootstrap (blocks/) to speed node sync before VRM index catch-up.
# Safe: only copies block files; does not touch explorer SQLite index.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BOOTSTRAP_ZIP="${VCEXP_VERIUM_BOOTSTRAP_ZIP:-$ROOT/verium-bootstrap.zip}"
VERIUM_DATA="${VCEXP_VERIUM_DATA_DIR:-/root/.verium}"

if [[ ! -f "$BOOTSTRAP_ZIP" ]]; then
  echo "Missing bootstrap: $BOOTSTRAP_ZIP"
  echo "Download: curl -LO https://files.vericonomy.com/vrm/bootstrap/verium-bootstrap.zip"
  exit 1
fi

echo "=== Stopping veriumd (if running) ==="
systemctl stop veriumd 2>/dev/null || true
sleep 2

echo "=== Applying bootstrap to $VERIUM_DATA ==="
mkdir -p "$VERIUM_DATA"
unzip -o "$BOOTSTRAP_ZIP" -d "$VERIUM_DATA"

echo "=== Starting veriumd ==="
systemctl start veriumd 2>/dev/null || true
sleep 3
systemctl is-active veriumd 2>/dev/null || echo "veriumd not managed by systemd — start manually"

echo "Done. Verify: verium-cli getblockcount"
