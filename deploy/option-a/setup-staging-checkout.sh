#!/usr/bin/env bash
set -euo pipefail

# One-time bootstrap: second git checkout for staging branch on the explorer droplet.
# Prod checkout stays at EXPLORER_PROD_ROOT (main); staging at EXPLORER_STAGING_ROOT.

PROD_ROOT="${EXPLORER_PROD_ROOT:-/root/vericonomyexplorer-v2}"
STAGING_ROOT="${EXPLORER_STAGING_ROOT:-/root/vericonomyexplorer-v2-staging}"
STAGING_REMOTE="${STAGING_GIT_REMOTE:-https://github.com/JoshiOS-VRY/vericonomyexplorer-v2.git}"
STAGING_BRANCH="${STAGING_GIT_BRANCH:-staging}"

if [[ -d "$STAGING_ROOT/.git" ]]; then
  echo "Staging checkout already exists at $STAGING_ROOT"
  exit 0
fi

echo "==> Clone staging branch to $STAGING_ROOT"
git clone --branch "$STAGING_BRANCH" "$STAGING_REMOTE" "$STAGING_ROOT"

if [[ -f "$PROD_ROOT/.env.production" && ! -f "$STAGING_ROOT/.env.staging" ]]; then
  echo "==> Seed .env.staging from prod .env.production"
  cp "$PROD_ROOT/.env.production" "$STAGING_ROOT/.env.staging"
  # Append staging overrides if not already present
  cat >>"$STAGING_ROOT/.env.staging" <<'EOF'

# --- staging overrides (setup-staging-checkout.sh) ---
STAGING_DOMAIN=staging-explorer.vericonomy.com
NEXT_PUBLIC_SITE_URL=https://staging-explorer.vericonomy.com
EXPLORER_SITE_URL=https://staging-explorer.vericonomy.com
STAGING_WEB_PORT=3010
STAGING_FAST_API_PORT=3013
PROD_COMPOSE_PROJECT=vericonomyexplorer-v2
EXPLORER_PROD_ROOT=/root/vericonomyexplorer-v2
STAGING_GIT_BRANCH=staging
STAGING_GIT_REMOTE=https://github.com/JoshiOS-VRY/vericonomyexplorer-v2.git
EOF
fi

if [[ -f "$PROD_ROOT/configs/chains.json" && ! -f "$STAGING_ROOT/configs/chains.json" ]]; then
  cp "$PROD_ROOT/configs/chains.json" "$STAGING_ROOT/configs/chains.json"
fi

chmod +x "$STAGING_ROOT/deploy/option-a/deploy-staging.sh"

echo ""
echo "Next steps:"
echo "  1. Edit $STAGING_ROOT/.env.staging (RPC creds copied from prod)"
echo "  2. Deploy prod Caddyfile once from staging branch (split hostnames):"
echo "       cd $PROD_ROOT && git pull && docker compose ... exec caddy caddy reload ..."
echo "  3. Deploy staging:"
echo "       cd $STAGING_ROOT && bash deploy/option-a/deploy-staging.sh"
