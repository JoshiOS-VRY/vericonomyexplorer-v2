export type HashrateSource = "recent_blocks" | "blocks_per_hour" | "recent_blocks_extended" | "networkhashps" | "nethashrate" | "difficulty" | "none";
export type MiningInfoLike = {
    networkhashps?: number | null;
    nethashrate?: number | null;
    blocksperhour?: number | null;
    /** Legacy RPC key: "nethashrate (kH/m)" */
    [key: string]: unknown;
};
export type ResolveNetworkHashrateInput = {
    miningInfo?: MiningInfoLike | null;
    difficulty?: number | null;
    /** Mean spacing over VRM_HASHRATE_WINDOW_BLOCKS (~30 min). */
    recentSpacingSec?: number | null;
    /** Mean spacing over VRM_POW_INTERVAL (72 blocks). */
    extendedSpacingSec?: number | null;
    blocksPerHour?: number | null;
    targetBlockTimeSec?: number;
};
export type ResolvedNetworkHashrate = {
    hashPerSec: number | null;
    hashrateKhPerMin: number | null;
    source: HashrateSource;
};
/** Normalize getmininginfo hashrate fields to H/s. */
export declare function normalizeMiningInfoHashrate(miningInfo?: MiningInfoLike | null): {
    hashPerSec: number | null;
    source: HashrateSource;
};
/**
 * Canonical live Verium network hashrate.
 * Prefers measured recent block spacing (Verium scrypt² formula) over the
 * laggy full-chain EMA in veriumd networkhashps.
 */
export declare function resolveNetworkHashPerSec(input: ResolveNetworkHashrateInput): ResolvedNetworkHashrate;
//# sourceMappingURL=resolve.d.ts.map