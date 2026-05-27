import type { VrmNetworkStats } from "../types/home.js";
export declare function fetchVrmDashboardBundle(): Promise<{
    summary: any;
    richlist: unknown;
    leaderboard: unknown;
    network: VrmNetworkStats;
    market: import("../types/home.js").ChainMarket;
    activityHistory: unknown;
    fetchedAt: string;
}>;
