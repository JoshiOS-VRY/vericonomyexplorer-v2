import type { VrmNetworkStats } from "../types/home.js";
export declare function fetchVrmDashboardBundle(): Promise<{
    summary: Record<string, unknown> & {
        health?: Record<string, unknown> & {
            heights?: {
                maxIndexedHeight?: number | null;
            };
        };
        latestBlocks?: unknown[];
    };
    richlist: Record<string, unknown>;
    leaderboard: Record<string, unknown>;
    network: VrmNetworkStats;
    market: import("../types/home.js").ChainMarket;
    activityHistory: Record<string, unknown>;
    fetchedAt: string;
}>;
