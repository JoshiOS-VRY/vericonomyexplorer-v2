import type { ChainId } from "../types.js";
type SummaryPayload = Record<string, unknown> & {
    health?: Record<string, unknown> & {
        heights?: {
            maxIndexedHeight?: number | null;
        };
    };
    latestBlocks?: unknown[];
};
type IndexerHealthPayload = Record<string, unknown> & {
    chains?: Array<Record<string, unknown> & {
        id?: string;
    }>;
};
export declare function enrichChainSummary(summary: SummaryPayload, chainId: ChainId, options?: Record<string, unknown>): Promise<SummaryPayload>;
export declare function enrichIndexerHealth(baseHealth: IndexerHealthPayload, options?: Record<string, unknown>): Promise<IndexerHealthPayload>;
export declare function fetchBlockWithRpcFallback(chainId: ChainId, hashOrHeight: string, indexed: Record<string, unknown>, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export {};
