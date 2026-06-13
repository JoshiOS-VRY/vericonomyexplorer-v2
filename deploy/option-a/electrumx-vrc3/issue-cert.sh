#!/usr/bin/env bash
# Issue Let's Encrypt cert for electrumx-vrc3 and wire into /etc/electrumx-vrc3.conf
set -euo pipefail

HOSTNAME="${ELECTRUMX_VRC3_HOST:-electrumx-vrc3.vericonomy.com}"
CONF_PATH="/etc/electrumx-vrc3.conf"
SERVICE_NAME="electrumx-vrc3"
WEBROOT="/var/www/acme"
TLS_DIR="/etc/electrumx-vrc3/tls"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root."
  exit 1
fi

mkdir -p "${WEBROOT}"

echo "==> Requesting certificate for ${HOSTNAME} (HTTP-01 via webroot)"
certbot certonly \
  --webroot -w "${WEBROOT}" \
  -d "${HOSTNAME}" \
  --preferred-challenges http-01 \
  --non-interactive --agree-tos \
  --email "${ACME_EMAIL:-admin@vericonomy.com}" \
  --keep-until-expiring

install -d -o electrumx -g electrumx -m 750 "${TLS_DIR}"
cp "/etc/letsencrypt/live/${HOSTNAME}/fullchain.pem" "${TLS_DIR}/fullchain.pem"
cp "/etc/letsencrypt/live/${HOSTNAME}/privkey.pem" "${TLS_DIR}/privkey.pem"
chown electrumx:electrumx "${TLS_DIR}"/*.pem
chmod 644 "${TLS_DIR}/fullchain.pem"
chmod 640 "${TLS_DIR}/privkey.pem"

if ! grep -q '^SSL_CERTFILE=' "${CONF_PATH}"; then
  cat >>"${CONF_PATH}" <<EOF

SSL_CERTFILE=${TLS_DIR}/fullchain.pem
SSL_KEYFILE=${TLS_DIR}/privkey.pem
EOF
  chmod 640 "${CONF_PATH}"
  chown root:electrumx "${CONF_PATH}"
else
  sed -i "s|^SSL_CERTFILE=.*|SSL_CERTFILE=${TLS_DIR}/fullchain.pem|" "${CONF_PATH}"
  sed -i "s|^SSL_KEYFILE=.*|SSL_KEYFILE=${TLS_DIR}/privkey.pem|" "${CONF_PATH}"
fi

install -d /etc/letsencrypt/renewal-hooks/deploy
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -m 755 "${SCRIPT_DIR}/renewal-hook.sh" /etc/letsencrypt/renewal-hooks/deploy/electrumx-vrc3.sh

systemctl restart "${SERVICE_NAME}"
echo "Certificate installed to ${TLS_DIR}; ${SERVICE_NAME} restarted."
