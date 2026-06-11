# VeriConomy Explorer Environment Setup

This document explains the runtime environment variables needed to run the VeriConomy Explorer V2 locally or on a staging server.

The explorer should not commit real node credentials. Use `.env.example` or this document as a template, then create a private `.env` file with real values on each machine.

## What The Explorer Needs

For a full local explorer run, the app needs:

```text
Verium RPC node -> current chain data and block ingestion
SQLite index DB -> address balances, transaction lookup, richlist, leaderboards
```

For the first proof of concept, Verium (VRM) is the primary chain. VeriCoin (VRC) remains wired for later, but VRC indexing should stay disabled or private until it has a trusted genesis-to-tip index.

## Does The Developer Need A Local Node?

Yes, for full backend testing the developer needs access to a running Verium node.

There are three practical development modes:

1. Full local dev: run a Verium node locally and point the explorer to `127.0.0.1`.
2. Shared node dev: connect to an existing Verium node over a VPN or private network.
3. Frontend-only dev: use mock/static API responses and skip live block/index testing.

Do not expose Verium or VeriCoin RPC ports to the public internet. If a shared node is used, put it behind a private network or VPN.

## Example `.env`

Create a file named `.env` in the project root:

```bash
# VeriConomy Explorer V2
# Copy this file to .env and replace placeholder values.
# Do not commit real RPC usernames/passwords.

# Web server
BTCEXP_HOST=0.0.0.0
BTCEXP_PORT=3002
NODE_ENV=development

# Primary chain for the current proof of concept
BTCEXP_COIN=VRM
BTCEXP_DISPLAY_CURRENCY=vrm
BTCEXP_UI_THEME=dark

# Legacy explorer RPC path
# Used by remaining inherited explorer routes while the new indexer UI is built out.
BTCEXP_BITCOIND_HOST=127.0.0.1
BTCEXP_BITCOIND_PORT=33987
BTCEXP_BITCOIND_USER=replace-with-verium-rpc-user
BTCEXP_BITCOIND_PASS=replace-with-verium-rpc-password
BTCEXP_BITCOIND_RPC_TIMEOUT=30000

# Indexer V2
VCEXP_INDEXER_SQLITE_PATH=database/vericonomy-index.sqlite
VCEXP_CHAINS_CONFIG=./configs/chains.vrm-poc.example.json

# Verium RPC for indexer
VCEXP_VRM_RPC_USER=replace-with-verium-rpc-user
VCEXP_VRM_RPC_PASS=replace-with-verium-rpc-password
VCEXP_VRM_RPC_COOKIE=

# Optional VeriCoin RPC for future VRC indexing
# Leave blank until VRC indexing is being tested.
VCEXP_VRC_RPC_USER=
VCEXP_VRC_RPC_PASS=
VCEXP_VRC_RPC_COOKIE=

# Performance / safety
BTCEXP_RPC_CONCURRENCY=3
BTCEXP_SLOW_DEVICE_MODE=true
BTCEXP_NO_RATES=true
BTCEXP_PRIVACY_MODE=true

# Cache / runtime paths
BTCEXP_FILESYSTEM_CACHE_DIR=./cache

# Optional basic auth for private staging
# Leave blank for local development.
BTCEXP_BASIC_AUTH_PASSWORD=

# Debug logging
# Useful examples:
# DEBUG=btcexp:app,btcexp:error
# DEBUG=btcexp:*
DEBUG=btcexp:app,btcexp:error
```

## Verium Node Config

The developer's Verium node needs RPC enabled. Exact file location depends on OS and wallet/node setup, but the config needs values like:

```ini
server=1
rpcuser=replace-with-verium-rpc-user
rpcpassword=replace-with-verium-rpc-password
rpcallowip=127.0.0.1
rpcbind=127.0.0.1
rpcport=33987
```

If the explorer runs in Docker and the node runs on the host, `127.0.0.1` from inside the container will not refer to the host machine. In that case use the host gateway/private IP or put the node and explorer on the same Docker/private network.

For a shared remote node, use a private hostname/IP in `.env`:

```bash
BTCEXP_BITCOIND_HOST=10.0.0.25
BTCEXP_BITCOIND_PORT=33987
```

## Install And Run

Install dependencies:

```bash
npm ci
```

Create local config:

```bash
cp configs/chains.example.json configs/chains.json
```

Edit `configs/chains.json` if the RPC host/ports differ from the defaults. Keep real credentials in `.env`, not in JSON config.

Start the web app:

```bash
npm start
```

Local URL:

```text
http://127.0.0.1:3002/
```

## Test The Indexer

Run smoke tests first. These do not require a live node:

```bash
npm run indexer:v2:smoke
npm run indexer:v2:query-smoke
npm run indexer:v2:repair-smoke
npm run indexer:v2:rollback-smoke
npm run indexer:v2:reorg-smoke
```

Once Verium RPC is working, run a small range:

```bash
npm run indexer:v2 -- --chain vrm --start 0 --end 10
```

Check index status:

```bash
npm run indexer:v2:status
```

Resume Verium indexing:

```bash
npm run indexer:vrm
```

## Trusted Data Rule

Address balances, transaction pages, richlists, and leaderboards should only be treated as authoritative when the Verium index is trusted.

Trusted means:

- indexing began at genesis,
- no missing block heights,
- no unresolved non-coinbase inputs,
- the local index tip matches the highest indexed block,
- the local index is close to the node tip.

If a developer starts indexing from the middle of the chain, the explorer can still be useful for UI work, but balances and richlists are not honest production data.

## Common Problems

RPC connection refused:

- Verium node is not running.
- `server=1` is missing.
- wrong RPC port.
- Docker container is pointing at its own `127.0.0.1` instead of the host.

RPC unauthorized:

- `BTCEXP_BITCOIND_USER/PASS` or `VCEXP_VRM_RPC_USER/PASS` do not match the node config.
- cookie auth is configured but the cookie path is not mounted/readable.

Indexer grows too fast:

- confirm `storeRawJson` is `false`.
- lower batch size.
- increase pause time.
- do not store generated SQLite databases in Git.

VRC node becomes unstable:

- keep VRC indexing off until needed.
- reduce RPC concurrency.
- tune the VeriCoin node `dbcache`.
- run VRC indexing sequentially, not at the same time as VRM.
