import type { VrcNetworkStats, VrmNetworkStats } from '../types/home.js';
/** Lightweight network stats for hot paths (home, SSR). Uses canonical hashrate resolver. */
export declare function fetchVrmNetworkStatsLite(): Promise<VrmNetworkStats>;
/** Lightweight VRC network stats for hot paths. Skips gettxoutsetinfo and legacy staking fallbacks. */
export declare function fetchVrcNetworkStatsLite(): Promise<VrcNetworkStats>;
