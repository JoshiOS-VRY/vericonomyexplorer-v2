#!/usr/bin/env bash
# Remove the legacy SQLite explorer index after Postgres cutover.
# Requires VCEXP_DB_BACKEND=postgres in .env.production.
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
DB_DIR="${VCEXP_INDEXER_SQLITE_DIR:-/var/lib/docker/volumes/vericonomyexplorer-v2_vericonomy-database/_data}"

if ! grep -q '^VCEXP_DB_BACKEND=postgres' "$ENV_FILE" 2>/dev/null; then
  echo "Refusing: set VCEXP_DB_BACKEND=postgres in $ENV_FILE first." >&2
  exit 1
fi

if [[ ! -d "$DB_DIR" ]]; then
  echo "Nothing to do: $DB_DIR not found." >&2
  exit 0
fi

cd "$DB_DIR"
shopt -s nullglob
files=(vericonomy-index.sqlite vericonomy-index.sqlite-shm vericonomy-index.sqlite-wal)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "Already retired (no SQLite index files in $DB_DIR)."
  exit 0
fi

echo "Removing legacy SQLite index in $DB_DIR:"
du -ch "${files[@]}" 2>/dev/null || true
rm -f "${files[@]}"
echo "Done. Reclaimed space:"
df -h / | tail -1
