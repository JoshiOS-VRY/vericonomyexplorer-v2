#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker-compose.option-a.yml --env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

echo "== Docker gateway (from vrc-indexer) =="
GATEWAY="$("${COMPOSE[@]}" exec -T vrc-indexer ip route 2>/dev/null | awk '/default/ {print $3; exit}')"
echo "default via ${GATEWAY:-unknown}"

echo
echo "== Container env (VRC) =="
"${COMPOSE[@]}" exec -T vrc-indexer printenv VCEXP_VRC_RPC_USER VCEXP_VRC_RPC_HOST 2>/dev/null || true
PASS_LEN="$("${COMPOSE[@]}" exec -T vrc-indexer printenv VCEXP_VRC_RPC_PASS 2>/dev/null | wc -c | tr -d ' ')"
echo "VCEXP_VRC_RPC_PASS length: ${PASS_LEN:-0}"

echo
echo "== RPC from vrc-indexer container =="
"${COMPOSE[@]}" exec -T vrc-indexer node -e "
const http=require('http');
const host=process.env.VCEXP_VRC_RPC_HOST||'172.18.0.1';
const u=process.env.VCEXP_VRC_RPC_USER;
const p=process.env.VCEXP_VRC_RPC_PASS;
if(!u||!p){console.error('Missing VCEXP_VRC_RPC_* env');process.exit(1);}
const auth=Buffer.from(u+':'+p).toString('base64');
const body=JSON.stringify({jsonrpc:'1.0',id:1,method:'getblockcount',params:[]});
const req=http.request({host,port:58683,method:'POST',path:'/',headers:{'Content-Type':'application/json','Authorization':'Basic '+auth},timeout:15000},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>console.log('HTTP',res.statusCode,d));});
req.on('error',e=>console.error('ERR',e.message));
req.on('timeout',()=>console.error('ERR timeout'));
req.write(body);req.end();
"

echo
echo "== Indexer status =="
"${COMPOSE[@]}" exec -T vrc-indexer npm run indexer:v2:status 2>/dev/null | sed -n '/vrc/,$p' || echo "(indexer status unavailable)"

echo
echo "== Public API (via Caddy) =="
PUBLIC_DOMAIN="$(grep -E '^PUBLIC_DOMAIN=' "$ENV_FILE" | cut -d= -f2- || true)"
if [[ -n "${PUBLIC_DOMAIN}" ]]; then
  curl -sk --resolve "${PUBLIC_DOMAIN}:443:127.0.0.1" \
    "https://${PUBLIC_DOMAIN}/v1/vrc/summary" | head -c 400
  echo
  curl -sk --resolve "${PUBLIC_DOMAIN}:443:127.0.0.1" \
    "https://${PUBLIC_DOMAIN}/v1/vrc/tip" | head -c 200
  echo
else
  echo "PUBLIC_DOMAIN not set in $ENV_FILE"
fi

echo
echo "Done."
