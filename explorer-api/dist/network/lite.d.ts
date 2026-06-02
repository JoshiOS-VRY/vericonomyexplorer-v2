import type { VrcNetworkStats, VrmNetworkStats } from "../types/home.js";
/** Lightweight network stats for hot paths (home, SSR). No gettxoutsetinfo or long hashrate scans. */
export declare function fetchVrmNetworkStatsLite(): Promise<VrmNetworkStats>;
/** Lightweight VRC network stats for hot paths. Skips gettxoutsetinfo and legacy staking fallbacks. */
export declare function fetchVrcNetworkStatsLite(): Promise<VrcNetworkStats>;
