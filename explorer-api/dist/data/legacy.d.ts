import type { ChainId } from '../types.js';
export declare function fetchChainSummary(chainId: string, options?: Record<string, unknown>): Promise<Record<string, unknown> & {
    health?: Record<string, unknown> & {
        heights?: {
            maxIndexedHeight?: number | null;
            blocksBehind?: number | null;
        };
    };
    latestBlocks?: unknown[];
}>;
export declare function fetchChainSummaryLite(chainId: string, options?: Record<string, unknown>): Promise<Record<string, unknown> & {
    health?: Record<string, unknown> & {
        heights?: {
            maxIndexedHeight?: number | null;
            blocksBehind?: number | null;
        };
    };
    latestBlocks?: unknown[];
}>;
export declare function fetchLatestBlocks(chainId: string, options?: Record<string, unknown>): Promise<(Record<string, unknown> & {
    height?: number;
    hash?: string;
    time?: number | null;
    extractedBy?: string | null;
    extractedByAddress?: string | null;
    outputCount?: number | null;
    interestRatePercent?: number | null;
})[]>;
export declare function fetchBlocksPage(chainId: string, options?: Record<string, unknown>): Promise<{
    items: (Record<string, unknown> & {
        height?: number;
        hash?: string;
        time?: number | null;
        extractedBy?: string | null;
        extractedByAddress?: string | null;
        outputCount?: number | null;
        interestRatePercent?: number | null;
    })[];
}>;
export declare function fetchLandingData(): Promise<{
    vrmSummary: Record<string, unknown> & {
        health?: Record<string, unknown> & {
            heights?: {
                maxIndexedHeight?: number | null;
                blocksBehind?: number | null;
            };
        };
        latestBlocks?: unknown[];
    };
    vrcSummary: Record<string, unknown> & {
        health?: Record<string, unknown> & {
            heights?: {
                maxIndexedHeight?: number | null;
                blocksBehind?: number | null;
            };
        };
        latestBlocks?: unknown[];
    };
    vrmRichlist: Record<string, unknown>;
    vrcRichlist: Record<string, unknown>;
    vrmLeaderboard: Record<string, unknown>;
}>;
export declare function fetchVrmDashboardIndexed(): Promise<unknown>;
export declare function fetchChainActivityHistory(chainId: string, options?: {
    maxPoints?: number;
    since?: number;
    chainHealth?: Record<string, unknown>;
}): Promise<unknown>;
export declare function fetchIndexerHealth(): Promise<Record<string, unknown> & {
    chains?: Array<Record<string, unknown> & {
        id?: string;
    }>;
}>;
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
export declare function fetchMinedLeaderboard(chainId: string, options?: {
    period?: string;
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
export declare function fetchTransaction(chainId: string, txid: string, queryOptions?: {
    timeoutMs?: number;
    priority?: number;
}): Promise<Record<string, unknown>>;
export declare function fetchTransactionRelatedAddresses(chainId: string, txid: string, options?: {
    limit?: number;
}): Promise<unknown>;
export declare function fetchAddress(chainId: string, address: string, options?: {
    limit?: number;
    offset?: number;
    includeRank?: boolean;
}, queryOptions?: {
    timeoutMs?: number;
}): Promise<Record<string, unknown>>;
export declare function fetchBlock(chainId: string, hashOrHeight: string, options?: {
    limit?: number;
    offset?: number;
}): Promise<Record<string, unknown>>;
export declare function fetchChainHealth(chainId: string): Promise<unknown>;
export declare function getCachedTip(chainId: ChainId): {
    height: number;
    hash: string;
} | undefined;
