#!/usr/bin/env bash
# Install ElectrumX for VeriCoin (vrc3) on the explorer droplet.
# Reuses /opt/electrumx-vrm3 (Vericonomy/electrumx). Requires synced vericoind, txindex=1.
set -euo pipefail

HOSTNAME="${ELECTRUMX_VRC3_HOST:-electrumx-vrc3.vericonomy.com}"
SSL_PORT="${ELECTRUMX_VRC3_SSL_PORT:-53012}"
WSS_PORT="${ELECTRUMX_VRC3_WSS_PORT:-53014}"
RPC_PORT="${ELECTRUMX_VRC3_RPC_PORT:-8034}"
SHARED_ROOT="${ELECTRUMX_SHARED_ROOT:-/opt/electrumx-vrm3}"
DB_DIR="${ELECTRUMX_VRC3_DB:-/var/lib/electrumx/vrc3}"
CONF_PATH="/etc/electrumx-vrc3.conf"
TLS_DIR="/etc/electrumx-vrc3/tls"
SERVICE_NAME="electrumx-vrc3"
REPO="${ELECTRUMX_REPO:-https://github.com/Vericonomy/electrumx.git}"
RPC_USER="${VCEXP_VRC_RPC_USER:-explorer_vrc_rpc_user}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root on the explorer droplet."
  exit 1
fi

if [[ -z "${VCEXP_VRC_RPC_PASS:-}" ]]; then
  echo "Set VCEXP_VRC_RPC_PASS (must match vericonomy.conf rpcpassword)."
  exit 1
fi

if ! id electrumx &>/dev/null; then
  useradd --system --home /var/lib/electrumx --shell /usr/sbin/nologin electrumx
fi

if [[ ! -x "${SHARED_ROOT}/venv/bin/python" ]]; then
  echo "==> Shared ElectrumX not found; installing at ${SHARED_ROOT}"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq \
    python3 python3-pip python3-venv python3-dev \
    build-essential libssl-dev libffi-dev \
    libleveldb-dev libleveldb1d \
    git certbot openssl
  git clone "${REPO}" "${SHARED_ROOT}"
  python3 -m venv "${SHARED_ROOT}/venv"
  "${SHARED_ROOT}/venv/bin/pip" install -U pip wheel
  "${SHARED_ROOT}/venv/bin/pip" install -e "${SHARED_ROOT}[uvloop,ujson]"
else
  echo "==> Reusing ElectrumX at ${SHARED_ROOT}"
fi

mkdir -p "${DB_DIR}" /var/www/acme "${TLS_DIR}"
chown -R electrumx:electrumx "${DB_DIR}" /var/lib/electrumx

echo "==> Config ${CONF_PATH}"
cat >"${CONF_PATH}" <<EOF
COIN=Vericoin
DB_DIRECTORY=${DB_DIR}
DAEMON_URL=http://${RPC_USER}:${VCEXP_VRC_RPC_PASS}@127.0.0.1:58683/
NET=mainnet

LOG_FORMAT=%(asctime)s %(levelname)s:%(name)s:%(message)s
LOG_LEVEL=info

SERVICES=ssl://0.0.0.0:${SSL_PORT},wss://0.0.0.0:${WSS_PORT},rpc://127.0.0.1:${RPC_PORT}
REPORT_SERVICES=ssl://${HOSTNAME}:${SSL_PORT},wss://${HOSTNAME}:${WSS_PORT}
PEER_DISCOVERY=off

DB_ENGINE=leveldb
EVENT_LOOP_POLICY=uvloop
MAX_SESSIONS=8000
CACHE_MB=4096
BANDWIDTH_UNIT_COST=50000
REQUEST_TIMEOUT=30
SESSION_TIMEOUT=600
EOF

if [[ ! -f "${TLS_DIR}/fullchain.pem" ]]; then
  echo "==> Bootstrap TLS cert (replace with issue-cert.sh after DNS + LE)"
  openssl req -x509 -newkey rsa:4096 \
    -keyout "${TLS_DIR}/privkey.pem" \
    -out "${TLS_DIR}/fullchain.pem" \
    -days 30 -nodes \
    -subj "/CN=${HOSTNAME}" \
    -addext "subjectAltName=DNS:${HOSTNAME}"
  chown electrumx:electrumx "${TLS_DIR}"/*.pem
  chmod 644 "${TLS_DIR}/fullchain.pem"
  chmod 640 "${TLS_DIR}/privkey.pem"
fi

cat >>"${CONF_PATH}" <<EOF

SSL_CERTFILE=${TLS_DIR}/fullchain.pem
SSL_KEYFILE=${TLS_DIR}/privkey.pem
EOF

chmod 640 "${CONF_PATH}"
chown root:electrumx "${CONF_PATH}"

echo "==> systemd unit"
cat >/etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=ElectrumX VeriCoin (vrc3)
After=network.target vericoind.service
Wants=vericoind.service

[Service]
EnvironmentFile=${CONF_PATH}
Environment=PYTHONUNBUFFERED=1
ExecStart=${SHARED_ROOT}/venv/bin/python ${SHARED_ROOT}/electrumx_server
ExecStop=${SHARED_ROOT}/venv/bin/python ${SHARED_ROOT}/electrumx_rpc -p ${RPC_PORT} stop
User=electrumx
Group=electrumx
LimitNOFILE=65536
CPUQuota=350%
TimeoutStopSec=30min
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "==> Firewall"
ufw allow "${SSL_PORT}/tcp" comment 'ElectrumX VRC3 TLS' || true
ufw allow "${WSS_PORT}/tcp" comment 'ElectrumX VRC3 WSS' || true

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

echo "Done. ${SERVICE_NAME} started (index sync may take days)."
echo "After DNS for ${HOSTNAME} -> this host: bash deploy/option-a/electrumx-vrc3/issue-cert.sh"
