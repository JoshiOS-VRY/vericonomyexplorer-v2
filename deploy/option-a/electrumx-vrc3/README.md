# ElectrumX VRC3 (explorer droplet)

Public TLS Electrum server for VeriCoin light wallets on the Vericonomy explorer VPS.

| Setting | Value |
| -------- | ----- |
| Host | `electrumx-vrc3.vericonomy.com` |
| TLS | `53012` |
| WSS | `53014` |
| Admin RPC | `127.0.0.1:8034` |
| Coin | Vericoin mainnet |
| Upstream | Local `vericoind` (`127.0.0.1:58683`, `txindex=1`) |
| Code | Shared with vrm3 at `/opt/electrumx-vrm3` |

Wallet default order: **vrc3 → vrc1 → vrc2**.

## DNS

```
electrumx-vrc3.vericonomy.com  A  178.128.151.104   (Cloudflare DNS only / gray cloud)
```

## Install

```bash
export VCEXP_VRC_RPC_PASS='…'   # same as vericonomy.conf rpcpassword
bash deploy/option-a/electrumx-vrc3/install.sh
bash deploy/option-a/electrumx-vrc3/issue-cert.sh   # after DNS propagates
```

Initial index sync for ~7M blocks may take **1–3 days**. External TLS ports stay closed until catch-up completes.

## Operations

After restart, vrc3 builds a **header merkle cache** (~7M blocks) at high CPU for 30–90+ minutes. A `CPUQuota=350%` systemd cap keeps vrm3/veriumd responsive. Ensure `vericonomy.conf` includes `rpcworkqueue=512` and `rpcthreads=16` (see `vericoin.conf.example`).

```bash
systemctl status electrumx-vrc3
journalctl -u electrumx-vrc3 -f
/opt/electrumx-vrm3/venv/bin/python /opt/electrumx-vrm3/electrumx_rpc -p 8034 getinfo
```

Expected `genesis_hash`: `000004da58a02be894a6c916d349fe23cc29e21972cafb86b5d3f07c4b8e6bb8`.
