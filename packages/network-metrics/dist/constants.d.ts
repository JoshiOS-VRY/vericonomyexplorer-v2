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
/** Extended window matching veriumd PoW retarget interval (GetPoWKHashPM). */
export declare const VRM_POW_INTERVAL = 72;
/** Floor on spacing used in hashrate calculations (seconds). Matches veriumd. */
export declare const VRM_POW_SPACING_MIN_SEC = 30;
/**
 * Scrypt² work factor used by veriumd GetPoWKHashPM:
 * 1024 × (2³² / 10⁶).
 */
export declare const VRM_POW_WORK_FACTOR: number;
/** Minimum blocks observed in the last hour before blocks-per-hour spacing is trusted. */
export declare const VRM_BLOCKS_PER_HOUR_MIN = 6;
//# sourceMappingURL=constants.d.ts.map