# Next.js Cutover Runbook

## Services

| Service        | Port | Role                          |
| -------------- | ---- | ----------------------------- |
| `explorer-web` | 3000 | Next.js UI                    |
| `explorer-api` | 3002 | Express API + legacy RPC      |
| `vrm-indexer`  | n/a  | Indexer worker writing SQLite |

## Staged Cutover

1. Deploy Express API and indexer unchanged.
2. Deploy `explorer-web` with `EXPLORER_API_URL` pointing to the API service.
3. Point Caddy public host to `explorer-web:3000`.
4. Keep Express Pug UI disabled or internal-only after parity validation.
5. Monitor indexer trust status and API error rates.

## Validation Checklist

- [ ] `/` landing loads VRM/VRC cards and `#vrc-later` anchor
- [ ] `/vrm/*` indexer pages render with source labels
- [ ] `/vrm/search` resolves block/tx/address and shows flash messages
- [ ] `/blocks` shows paginated block table (not raw JSON)
- [ ] Legacy `/block`, `/tx`, `/address`, `/search` routes respond
- [ ] `/admin/*` gated when `EXPLORER_ADMIN_TOKEN` set
- [ ] Legacy cleanup redirects work (`/block/block/:hash`, etc.)
- [ ] Theme toggle persists; `BTCEXP_UI_THEME` sets default
- [ ] `npm run dev:full` starts API + indexer + Next from shared root env

## Rollback

Point Caddy back to Express `:3002` and stop `explorer-web` container.
