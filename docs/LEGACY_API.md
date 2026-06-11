# Legacy Express API (port 3002)

The original btc-rpc-explorer Express server on port **3002** is retained only for legacy Pug-rendered pages and admin tooling that have not yet been migrated to Next.js.

## Do not use for hot paths

All explorer hot paths now go through **explorer-api** (Fastify, port **3003**):

| Legacy (avoid)                | Fast API (use)              |
| ----------------------------- | --------------------------- |
| `/api/blocks/tip/height`      | `/v1/vrm/tip/height`        |
| `/api/indexer/:chain/summary` | `/v1/:chain/summary`        |
| `/api/indexer/landing`        | `/v1/landing`               |
| `/api/indexer/vrm/dashboard`  | `/v1/vrm/dashboard`         |
| polling every 8s              | SSE `/v1/:chain/tip/stream` |

Next.js rewrites:

- `/v1/*` → explorer-api `:3003`
- `/backend-api/*` → legacy Express `:3002` (admin, snippets, unmigrated pages only)

## Why legacy is slow

Legacy routes run session + CSRF middleware, share a global RPC queue (concurrency 3 in slow-device mode), use jayson without HTTP keep-alive, and compete with startup background tasks (`refreshNetworkVolumes`, `refreshUtxoSetSummary`, etc.).

## Running legacy (optional)

```bash
npm start   # Express on :3002 — only needed for unmigrated Pug/admin routes
```

For normal development use:

```bash
npm run dev:full   # explorer-api + indexers + Next.js
```
