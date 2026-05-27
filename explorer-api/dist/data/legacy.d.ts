import type { ChainId } from "../types.js";
export declare function fetchChainSummary(chainId: string, options?: Record<string, unknown>): Promise<Record<string, unknown> & {
    health?: Record<string, unknown> & {
        heights?: {
            maxIndexedHeight?: number | null;
        };
    };
    latestBlocks?: unknown[];
}>;
export declare function fetchLandingData(): Promise<{
    vrmSummary: Record<string, unknown> & {
        health?: Record<string, unknown> & {
            heights?: {
                maxIndexedHeight?: number | null;
            };
        };
        latestBlocks?: unknown[];
    };
    vrcSummary: Record<string, unknown> & {
        health?: Record<string, unknown> & {
            heights?: {
                maxIndexedHeight?: number | null;
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
export declare function fetchAddress(chainId: string, address: string, options?: {
    limit?: number;
    offset?: number;
    includeRank?: boolean;
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
}): Promise<Record<string, unknown>>;
export declare function fetchChainHealth(chainId: string): Promise<unknown>;
export declare function getCachedTip(chainId: ChainId): {
    height: number;
    hash: string;
} | undefined;
