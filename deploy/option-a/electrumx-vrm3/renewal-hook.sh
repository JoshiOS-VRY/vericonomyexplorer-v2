#!/usr/bin/env bash
set -euo pipefail
HOST=electrumx-vrm3.vericonomy.com
TLS_DIR=/etc/electrumx-vrm3/tls
install -d -o electrumx -g electrumx -m 750 "$TLS_DIR"
cp "/etc/letsencrypt/live/${HOST}/fullchain.pem" "$TLS_DIR/fullchain.pem"
cp "/etc/letsencrypt/live/${HOST}/privkey.pem" "$TLS_DIR/privkey.pem"
chown electrumx:electrumx "$TLS_DIR"/*.pem
chmod 644 "$TLS_DIR/fullchain.pem"
chmod 640 "$TLS_DIR/privkey.pem"
systemctl restart electrumx-vrm3.service
