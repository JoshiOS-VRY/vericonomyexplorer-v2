export declare function fetchVrmDashboardBundle(): Promise<{
    summary: Record<string, unknown> & {
        health?: Record<string, unknown> & {
            heights?: {
                maxIndexedHeight?: number | null;
                blocksBehind?: number | null;
            };
        };
        latestBlocks?: unknown[];
    };
    richlist: Record<string, unknown>;
    leaderboard: Record<string, unknown>;
    miners: Record<string, unknown>;
    activityHistory: Record<string, unknown> | undefined;
    fetchedAt: string;
}>;
