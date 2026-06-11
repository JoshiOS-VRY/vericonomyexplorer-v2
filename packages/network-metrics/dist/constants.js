/** Verium PoWT target block time (seconds). */
export const VRM_TARGET_BLOCK_TIME_SEC = 300;
/** Standard poll / cache interval for live network hashrate display. */
export const NETWORK_HASHRATE_POLL_MS = 30_000;
/** VRM blocks per day at 300s target block time. */
export const VRM_BLOCKS_PER_DAY = Math.floor((24 * 60 * 60) / VRM_TARGET_BLOCK_TIME_SEC);
/** VRM blocks in a 7-day window at 300s target block time. */
export const VRM_BLOCKS_7_DAYS = VRM_BLOCKS_PER_DAY * 7;
