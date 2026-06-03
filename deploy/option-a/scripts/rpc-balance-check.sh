#!/bin/sh
set -e
ADDR="${1:?address required}"
# VeriCoin RPC on host gateway (from indexer container network)
RPC_HOST="${VCEXP_VRC_RPC_HOST:-172.18.0.1}"
RPC_PORT="${VCEXP_VRC_RPC_PORT:-58684}"
RPC_USER="${VCEXP_VRC_RPC_USER}"
RPC_PASS="${VCEXP_VRC_RPC_PASS}"
BODY=$(printf '{"jsonrpc":"1.0","id":"1","method":"listunspent","params":[0,9999999,["%s"]]}' "$ADDR")
curl -sS --user "$RPC_USER:$RPC_PASS" \
  -H 'content-type: application/json' \
  -d "$BODY" "http://${RPC_HOST}:${RPC_PORT}/" | head -c 4000
