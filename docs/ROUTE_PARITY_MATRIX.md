# Route Parity Matrix

Migration reference: Express/Pug routes → Next.js App Router routes.

| Legacy Route | Next.js Route | Data Source | Acceptance |
|---|---|---|---|
| `GET /` (indexer) | `/` | `/api/indexer/status`, `/api/indexer/{vrm,vrc}/summary`, richlist, leaderboard | Dual-chain landing, VRM live cards, search form |
| `GET /vrm`, `/verium` | `/vrm` | `/api/indexer/vrm/summary`, richlist, leaderboard | Chain hub with stats, blocks, txs |
| `GET /vrm/richlist` | `/vrm/richlist` | `/api/indexer/vrm/richlist` | Pagination, trust gating, source labels |
| `GET /vrm/leaderboard` | `/vrm/leaderboard` | `/api/indexer/vrm/leaderboard` | period/sort query params |
| `GET /vrm/address/:address` | `/vrm/address/[address]` | `/api/indexer/vrm/address/:address` | Balance, history pagination |
| `GET /vrm/tx/:txid` | `/vrm/tx/[txid]` | `/api/indexer/vrm/tx/:txid` | Inputs, outputs, deltas |
| `GET /vrm/block/:hashOrHeight` | `/vrm/block/[hashOrHeight]` | `/api/indexer/vrm/block/:hashOrHeight` | Block metadata, tx list |
| `GET /vrc/block/:hashOrHeight` | `/vrc/block/[hashOrHeight]` | `/api/indexer/vrc/block/:hashOrHeight` | VRC block metadata, tx list |
| `GET /vrc/tx/:txid` | `/vrc/tx/[txid]` | `/api/indexer/vrc/tx/:txid` | VRC transaction detail |
| `GET /vrc/address/:address` | `/vrc/address/[address]` | `/api/indexer/vrc/address/:address` | VRC address detail |
| `POST /vrm/search` | `POST /vrm/search` (Server Action) | indexer address/tx lookup | Redirect to block/tx/address |
| `POST /vrc/search` | `POST /vrc/search` (Server Action) | indexer address/tx lookup | Redirect to VRC block/tx/address |
| `GET /blocks` | `/blocks` | `/api/blocks/tip`, internal-api | Block list |
| `GET /block/:hash` | `/block/[hash]` | `/api/block/:hashOrHeight` | Block detail |
| `GET /block-height/:h` | `/block-height/[height]` | `/api/block/:hashOrHeight` | Block by height |
| `GET /tx/:id` | `/tx/[txid]` | `/api/tx/:txid` | Transaction detail |
| `GET /address/:addr` | `/address/[address]` | `/api/address/:address` | Address detail |
| `GET /search`, `POST /search` | `/search` | RPC + indexer | Universal search |
| `GET /mempool-summary` | `/mempool-summary` | internal-api | Mempool summary |
| `GET /mempool-transactions` | `/mempool-transactions` | internal-api | Mempool txs |
| `GET /mining-summary` | `/mining-summary` | internal-api | Mining summary |
| `GET /next-block` | `/next-block` | `/api/mining/next-block` | Next block template |
| `GET /peers` | `/peers` | coreApi | Peer list |
| `GET /connect`, `POST /connect` | `/connect` | session | RPC connect flow |
| `GET /disconnect` | `/disconnect` | session | Disconnect |
| `GET /user-settings` | `/user-settings` | session | UI preferences |
| `GET /changeSetting` | `/api/settings` | session | Setting toggle |
| `GET /session-data` | `/api/session` | session | Session JSON |
| `GET /xyzpub/:key` | `/xyzpub/[key]` | `/api/xyzpub/:key` | Extended pubkey |
| `GET /block-stats` | `/block-stats` | coreApi | Block stats |
| `GET /predicted-blocks` | `/predicted-blocks` | internal-api | Predicted blocks |
| `GET /block-analysis` | `/block-analysis` | coreApi | Block analysis search |
| `GET /block-analysis/:id` | `/block-analysis/[id]` | coreApi | Block analysis |
| `GET /next-halving` | `/next-halving` | `/api/blockchain/next-halving` | Halving info |
| `GET /rpc-terminal` | `/rpc-terminal` | rpcApi | RPC terminal |
| `POST /rpc-terminal` | `/rpc-terminal` (action) | rpcApi | Execute RPC |
| `GET /rpc-browser` | `/rpc-browser` | rpcApi | RPC browser |
| `GET /terminal` | `/terminal` | session | Terminal |
| `GET /tx-stats` | `/tx-stats` | coreApi | Tx stats chart |
| `GET /difficulty-history` | `/difficulty-history` | coreApi | Difficulty chart |
| `GET /utxo-set` | `/utxo-set` | `/api/blockchain/utxo-set` | UTXO set |
| `GET /about` | `/about` | static | About page |
| `GET /tools` | `/tools` | static | Tools page |
| `GET /changelog` | `/changelog` | static | Changelog |
| `GET /bitcoin-whitepaper` | `/bitcoin-whitepaper` | static | Whitepaper |
| `GET /api/docs` | `/api/docs` | apiDocs | API docs |
| `GET /admin/*` | `/admin/*` | adminAuth + coreApi | Admin dashboard |
| `GET /snippet/*` | `/api/snippet/*` | coreApi | HTMX partials → JSON |
| `GET /internal-api/*` | `/api/internal/*` | coreApi | Internal AJAX |
| Cleanup redirects | `middleware.ts` | — | Legacy URL redirects |

## Public API Routes (unchanged, served by Express or proxied)

- `GET /api/indexer/status`
- `GET /api/indexer/:chainId/summary`
- `GET /api/indexer/:chainId/richlist`
- `GET /api/indexer/:chainId/leaderboard`
- `GET /api/indexer/:chainId/address/:address`
- `GET /api/indexer/:chainId/tx/:txid`
- `GET /api/indexer/:chainId/block/:hashOrHeight`
- Legacy `/api/*` routes from `routes/apiRouter.js`

## Trust / Source Label Rules

- Richlist/leaderboard disabled unless chain health `status === "trusted"` (unless `allowUntrusted=true` dev flag).
- Every displayed metric must show `source.label` from API responses.
- VRC public richlist deferred until trusted index exists.
