import type { ChainId } from "../types.js";
export declare function fetchOnChainSupply(chainId: ChainId, rpcCall: (method: string, params?: unknown[]) => Promise<unknown>, blocks: number): Promise<number | null>;
export declare function getMaxSupply(chainId: ChainId): number | null;
export declare function getTargetBlockTimeSeconds(chainId: ChainId): number;
export declare function hashPerSecToKhPerMin(hashPerSec: number): number;
export declare function fetchVrmHashrate(rpcCall: (method: string, params?: unknown[]) => Promise<unknown>, chainId?: ChainId): Promise<{
    currentHashPerSec: number | null;
    hashrate7dHashPerSec: number | null;
}>;
