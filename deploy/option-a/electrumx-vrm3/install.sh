#!/usr/bin/env bash
# Install ElectrumX for Verium (vrm3) on the explorer droplet.
# Requires: synced veriumd with txindex=1, RPC on 127.0.0.1:33987.
set -euo pipefail

HOSTNAME="${ELECTRUMX_VRM3_HOST:-electrumx-vrm3.vericonomy.com}"
SSL_PORT="${ELECTRUMX_VRM3_SSL_PORT:-53002}"
WSS_PORT="${ELECTRUMX_VRM3_WSS_PORT:-53004}"
INSTALL_ROOT="${ELECTRUMX_VRM3_ROOT:-/opt/electrumx-vrm3}"
DB_DIR="${ELECTRUMX_VRM3_DB:-/var/lib/electrumx/vrm3}"
CONF_PATH="/etc/electrumx-vrm3.conf"
SERVICE_NAME="electrumx-vrm3"
REPO="${ELECTRUMX_VRM3_REPO:-https://github.com/Vericonomy/electrumx.git}"
RPC_USER="${VCEXP_VRM_RPC_USER:-explorer_rpc_user}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root on the explorer droplet."
  exit 1
fi

if [[ -z "${VCEXP_VRM_RPC_PASS:-}" ]]; then
  echo "Set VCEXP_VRM_RPC_PASS (must match verium.conf rpcpassword)."
  exit 1
fi

echo "==> Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  python3 python3-pip python3-venv python3-dev \
  build-essential libssl-dev libffi-dev \
  libleveldb-dev libleveldb1d \
  git certbot

if ! id electrumx &>/dev/null; then
  useradd --system --home /var/lib/electrumx --shell /usr/sbin/nologin electrumx
fi

echo "==> Cloning ElectrumX (${REPO})"
mkdir -p "$(dirname "${INSTALL_ROOT}")"
if [[ -d "${INSTALL_ROOT}/.git" ]]; then
  git -C "${INSTALL_ROOT}" fetch --tags origin
  git -C "${INSTALL_ROOT}" checkout master
  git -C "${INSTALL_ROOT}" pull --ff-only origin master
else
  git clone "${REPO}" "${INSTALL_ROOT}"
fi

echo "==> Python venv + install"
python3 -m venv "${INSTALL_ROOT}/venv"
"${INSTALL_ROOT}/venv/bin/pip" install -U pip wheel
"${INSTALL_ROOT}/venv/bin/pip" install -e "${INSTALL_ROOT}[uvloop,ujson]"

install -m 0755 "${INSTALL_ROOT}/electrumx_server" /usr/local/bin/electrumx_server_vrm3
install -m 0755 "${INSTALL_ROOT}/electrumx_rpc" /usr/local/bin/electrumx_rpc_vrm3

echo "==> Data directory"
mkdir -p "${DB_DIR}" /var/www/acme
chown -R electrumx:electrumx "${DB_DIR}" /var/lib/electrumx

echo "==> Config ${CONF_PATH}"
cat >"${CONF_PATH}" <<EOF
COIN=Verium
DB_DIRECTORY=${DB_DIR}
DAEMON_URL=http://${RPC_USER}:${VCEXP_VRM_RPC_PASS}@127.0.0.1:33987/
NET=mainnet

LOG_FORMAT=%(asctime)s %(levelname)s:%(name)s:%(message)s
LOG_LEVEL=info

SERVICES=ssl://0.0.0.0:${SSL_PORT},wss://0.0.0.0:${WSS_PORT},rpc://127.0.0.1:8033
REPORT_SERVICES=ssl://${HOSTNAME}:${SSL_PORT},wss://${HOSTNAME}:${WSS_PORT}
PEER_DISCOVERY=off

DB_ENGINE=leveldb
EVENT_LOOP_POLICY=uvloop
MAX_SESSIONS=2000
CACHE_MB=2048
BANDWIDTH_UNIT_COST=50000
REQUEST_TIMEOUT=30
SESSION_TIMEOUT=600
EOF

chmod 640 "${CONF_PATH}"
chown root:electrumx "${CONF_PATH}"

echo "==> systemd unit"
cat >/etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=ElectrumX Verium (vrm3)
After=network.target veriumd.service
Wants=veriumd.service

[Service]
EnvironmentFile=${CONF_PATH}
Environment=PYTHONUNBUFFERED=1
ExecStart=${INSTALL_ROOT}/venv/bin/python ${INSTALL_ROOT}/electrumx_server
ExecStop=${INSTALL_ROOT}/venv/bin/python ${INSTALL_ROOT}/electrumx_rpc -p 8033 stop
User=electrumx
Group=electrumx
LimitNOFILE=8192
TimeoutStopSec=30min
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "==> Firewall"
ufw allow "${SSL_PORT}/tcp" comment 'ElectrumX VRM3 TLS' || true
ufw allow "${WSS_PORT}/tcp" comment 'ElectrumX VRM3 WSS' || true

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"

echo "Done. Next: run issue-cert.sh after DNS for ${HOSTNAME} points to this host, then systemctl start ${SERVICE_NAME}"
