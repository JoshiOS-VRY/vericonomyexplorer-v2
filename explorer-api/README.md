# explorer-api

Fast lean API for the VeriConomy block explorer (port **3003**).

## Requirements

- **Use the same Node.js version** as the repo root (indexers + legacy Express). Native `better-sqlite3` is loaded from the repo root `node_modules`.
- Verium / VeriCoin RPC nodes reachable per `configs/chains.json`.

## Setup

```bash
# From repo root — rebuild native module for your Node version
# Stop indexer workers first if rebuild reports EBUSY/EPERM
npm run api:rebuild-native

npm run api:dev
```

If you see `ERR_DLOPEN_FAILED` / `NODE_MODULE_VERSION` mismatch:

1. Check `node -v` in the terminal running `api:dev`
2. Stop `npm run indexer:vrm` / `indexer:vrc` (they lock the `.node` file)
3. Run `npm rebuild better-sqlite3` at repo root
4. Restart indexers and `npm run api:dev`

## Endpoints

See [docs/INDEXER_V2_API.md](../docs/INDEXER_V2_API.md) — all `/v1/*` routes.
