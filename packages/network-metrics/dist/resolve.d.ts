export type HashrateSource = "networkhashps" | "nethashrate" | "getnetworkhashps" | "difficulty" | "none";
export type MiningInfoLike = {
    networkhashps?: number | null;
    nethashrate?: number | null;
};
export type ResolveNetworkHashrateInput = {
    miningInfo?: MiningInfoLike | null;
    hashrate1d?: number | null;
    hashrate7d?: number | null;
    difficulty?: number | null;
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
/** Canonical fallback chain for live Verium network hashrate. */
export declare function resolveNetworkHashPerSec(input: ResolveNetworkHashrateInput): ResolvedNetworkHashrate;
//# sourceMappingURL=resolve.d.ts.map