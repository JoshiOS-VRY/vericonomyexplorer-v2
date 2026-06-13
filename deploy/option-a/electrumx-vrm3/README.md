# ElectrumX VRM3 (explorer droplet)

Public TLS Electrum server for Verium light wallets on the Vericonomy explorer VPS.

| Setting | Value |
| -------- | ----- |
| Host | `electrumx-vrm3.vericonomy.com` |
| TLS | `53002` |
| WSS | `53004` |
| Coin | Verium mainnet |
| Upstream | Local `veriumd` (`127.0.0.1:33987`, `txindex=1`) |
| Software | [Vericonomy/electrumx](https://github.com/Vericonomy/electrumx) 1.16.0 |

Wallet default order (after app update): **vrm3 → vrm1 → vrm2**.

## DNS

Create an **A record**:

```
electrumx-vrm3.vericonomy.com  →  178.128.151.104
```

(Use the explorer droplet primary IP; secondary `165.227.253.237` is optional.)

## Install

Ensure `verium.conf` includes high-throughput RPC settings for ElectrumX (default queue depth 128 is too small):

```ini
rpcworkqueue=512
rpcthreads=16
```

On the explorer droplet as root, from the repo root:

```bash
export VCEXP_VRM_RPC_PASS='…'   # same as verium.conf rpcpassword
bash deploy/option-a/electrumx-vrm3/install.sh
```

Ensure Caddy serves ACME for the hostname (see `Caddyfile` `electrumx-vrm3` block), then:

```bash
export ACME_EMAIL=admin@vericonomy.com
bash deploy/option-a/electrumx-vrm3/issue-cert.sh
```

Initial index sync can take several hours. While catching up, ElectrumX only accepts loopback RPC.

## Operations

```bash
systemctl status electrumx-vrm3
journalctl -u electrumx-vrm3 -f
/opt/electrumx-vrm3/venv/bin/python /opt/electrumx-vrm3/electrumx_rpc -p 8033 getinfo
```

## Conformance test (from any host)

```bash
python3 - <<'PY'
import json, ssl, socket
host, port = "electrumx-vrm3.vericonomy.com", 53002
ctx = ssl.create_default_context()
s = ctx.wrap_socket(socket.create_connection((host, port), 10), server_hostname=host)
s.sendall((json.dumps({"id":1,"method":"server.features","params":[]})+"\n").encode())
print(s.recv(4096).decode())
PY
```

Expected `genesis_hash`: `8232c0cf3bd7e05546e3d7aaaaf89fed8bc97c4df1a8c95e9249e13a2734932b`.
