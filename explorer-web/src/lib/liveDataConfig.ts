/** Shared live-data poll intervals for explorer client refresh. */

/** Entity pages: address balance/txs, richlist rows, block/tx near tip. */
export const ENTITY_LIVE_POLL_MS = 10_000;

/** Global chain summary store (header sync, home dashboards). */
export const CHAIN_SUMMARY_POLL_MS = 10_000;

/** Latest blocks strip / chain blocks panel. */
export const LATEST_BLOCKS_POLL_MS = 15_000;

/** Home / insights network stats. */
export const NETWORK_LIVE_POLL_MS = 10_000;

/** Home market quotes (external API — slower cadence). */
export const MARKET_LIVE_POLL_MS = 60_000;

/** Address balance chart (aligned with entity poll). */
export const ADDRESS_BALANCE_HISTORY_POLL_MS = ENTITY_LIVE_POLL_MS;

/** Chain activity chart (hourly buckets; cron refreshes every minute). */
export const CHAIN_ACTIVITY_HISTORY_POLL_MS = 60_000;

/** Poll block/tx detail when within this many blocks of chain tip. */
export const NEAR_TIP_BLOCK_THRESHOLD = 20;
