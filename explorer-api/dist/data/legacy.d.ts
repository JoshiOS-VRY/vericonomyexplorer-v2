export declare function fetchChainSummary(chainId: string, options?: Record<string, unknown>): Promise<any>;
export declare function fetchLandingData(): Promise<{
    vrmSummary: any;
    vrcSummary: any;
    vrmRichlist: unknown;
    vrcRichlist: unknown;
    vrmLeaderboard: unknown;
}>;
export declare function fetchVrmDashboard(): Promise<{
    summary: any;
    richlist: unknown;
    leaderboard: unknown;
    activityHistory: unknown;
}>;
export declare function fetchChainActivityHistory(chainId: string, options?: {
    maxPoints?: number;
    since?: number;
}): Promise<unknown>;
export declare function fetchIndexerHealth(): Promise<any>;
export declare function fetchRichlist(chainId: string, options?: {
    limit?: number;
    offset?: number;
}): Promise<unknown>;
export declare function fetchLeaderboard(chainId: string, options?: {
    period?: string;
    sort?: string;
    limit?: number;
    offset?: number;
}): Promise<unknown>;
export declare function fetchAddress(chainId: string, address: string, options?: {
    limit?: number;
    offset?: number;
}): Promise<unknown>;
export declare function fetchAddressBalanceHistory(chainId: string, address: string, options?: {
    maxPoints?: number;
    since?: number;
}): Promise<unknown>;
export declare function fetchAddressUtxos(chainId: string, address: string, options?: {
    limit?: number;
    offset?: number;
}): Promise<unknown>;
export declare function fetchTransaction(chainId: string, txid: string): Promise<unknown>;
export declare function fetchBlock(chainId: string, hashOrHeight: string, options?: {
    limit?: number;
    offset?: number;
}): Promise<any>;
export declare function fetchChainHealth(chainId: string): Promise<unknown>;
