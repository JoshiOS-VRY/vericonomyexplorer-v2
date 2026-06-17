import type { ChainId } from '../types.js';
type BlockRecord = Record<string, unknown> & {
    height?: number;
    hash?: string;
    time?: number | null;
    extractedBy?: string | null;
    extractedByAddress?: string | null;
    outputCount?: number | null;
    interestRatePercent?: number | null;
};
type SummaryPayload = Record<string, unknown> & {
    health?: Record<string, unknown> & {
        heights?: {
            maxIndexedHeight?: number | null;
            blocksBehind?: number | null;
        };
    };
    latestBlocks?: unknown[];
};
type IndexerHealthPayload = Record<string, unknown> & {
    chains?: Array<Record<string, unknown> & {
        id?: string;
    }>;
};
export declare function enrichLatestBlocksLive(latestBlocks: unknown, chainId: ChainId, summaryHealth: SummaryPayload['health'], options?: Record<string, unknown>): Promise<BlockRecord[]>;
export declare function enrichChainSummary(summary: SummaryPayload, chainId: ChainId, options?: Record<string, unknown>): Promise<SummaryPayload>;
export declare function enrichIndexerHealth(baseHealth: IndexerHealthPayload, options?: Record<string, unknown>): Promise<IndexerHealthPayload>;
export declare function fetchBlockWithRpcFallback(chainId: ChainId, hashOrHeight: string, indexed: Record<string, unknown>, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function fetchTransactionWithRpcFallback(chainId: ChainId, txid: string, indexed: Record<string, unknown>, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function fetchAddressWithRpcFallback(chainId: ChainId, address: string, indexed: Record<string, unknown>, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export {};
