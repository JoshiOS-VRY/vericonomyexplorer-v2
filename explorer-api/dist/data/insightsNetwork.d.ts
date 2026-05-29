export declare function fetchNetworkMetricHistory(chainId: string, options?: {
    maxPoints?: number;
    since?: number;
    groupBy?: string;
    chainHealth?: Record<string, unknown>;
}): Promise<unknown>;
