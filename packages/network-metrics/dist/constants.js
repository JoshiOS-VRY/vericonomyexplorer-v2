/** Verium PoWT target block time (seconds). */
export const VRM_TARGET_BLOCK_TIME_SEC = 300;
/** Standard poll / cache interval for live network hashrate display. */
export const NETWORK_HASHRATE_POLL_MS = 10_000;
/** VRM blocks per day at 300s target block time. */
export const VRM_BLOCKS_PER_DAY = Math.floor((24 * 60 * 60) / VRM_TARGET_BLOCK_TIME_SEC);
/** VRM blocks in a 7-day window at 300s target block time. */
export const VRM_BLOCKS_7_DAYS = VRM_BLOCKS_PER_DAY * 7;
/** Primary reactive window (~30 min at 300s target spacing). */
export const VRM_HASHRATE_WINDOW_BLOCKS = 6;
/** Extended window matching veriumd PoW retarget interval (GetPoWKHashPM). */
export const VRM_POW_INTERVAL = 72;
/** Floor on spacing used in hashrate calculations (seconds). Matches veriumd. */
export const VRM_POW_SPACING_MIN_SEC = 30;
/**
 * Scrypt² work factor used by veriumd GetPoWKHashPM:
 * 1024 × (2³² / 10⁶).
 */
export const VRM_POW_WORK_FACTOR = 1024 * (2 ** 32 / 1e6);
/** Minimum blocks observed in the last hour before blocks-per-hour spacing is trusted. */
export const VRM_BLOCKS_PER_HOUR_MIN = 6;
