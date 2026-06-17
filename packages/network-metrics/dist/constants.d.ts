/** Verium PoWT target block time (seconds). */
export declare const VRM_TARGET_BLOCK_TIME_SEC = 300;
/** Standard poll / cache interval for live network hashrate display. */
export declare const NETWORK_HASHRATE_POLL_MS = 10000;
/** VRM blocks per day at 300s target block time. */
export declare const VRM_BLOCKS_PER_DAY: number;
/** VRM blocks in a 7-day window at 300s target block time. */
export declare const VRM_BLOCKS_7_DAYS: number;
/** Primary reactive window (~30 min at 300s target spacing). */
export declare const VRM_HASHRATE_WINDOW_BLOCKS = 6;
/**
 * Ignore the short recent-blocks window when mean spacing exceeds this (seconds).
 * Slow block luck lowers spacing-based estimates far below actual mining power;
 * difficulty retargets on 72 blocks, not every slow gap.
 */
export declare const VRM_HASHRATE_MAX_RECENT_SPACING_SEC: number;
/** Extended window matching veriumd PoW retarget interval (GetPoWKHashPM). */
export declare const VRM_POW_INTERVAL = 72;
/** Floor on spacing used in hashrate calculations (seconds). Matches veriumd. */
export declare const VRM_POW_SPACING_MIN_SEC = 30;
/**
 * Scrypt² work factor matching veriumd GetPoWKHashPM:
 * 1024 × 2³² / 1000 (= 4398046511.104 H/s per unit difficulty at 1s spacing).
 * Use /1000 not /1e6 — the C++ literal 4294.967296 comment is misleading and
 * `(1024 * 2**32) / 1e6` loses precision in IEEE doubles (~1000× too small).
 */
export declare const VRM_POW_WORK_FACTOR: number;
/** Minimum blocks observed in the last hour before blocks-per-hour spacing is trusted. */
export declare const VRM_BLOCKS_PER_HOUR_MIN = 6;
//# sourceMappingURL=constants.d.ts.map