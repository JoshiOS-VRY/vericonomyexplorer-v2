import type { ChainId } from "../types.js";
export type RpcCall = (method: string, params?: unknown[], timeoutMs?: number) => Promise<unknown>;
export declare function parseRpcNumber(value: unknown): number | null;
export declare function supplyFromBlockchainInfo(blockchainInfo: unknown): number | null;
export declare function parseVrcMiningInfo(miningInfo: unknown): {
    interestRatePercent: number | null;
    netStakeWeight: number | null;
    expectedStakeTimeSeconds: number | null;
    difficulty: number | null;
};
export declare function fetchOnChainSupply(chainId: ChainId, rpcCall: RpcCall, blocks: number, blockchainInfo?: unknown): Promise<number | null>;
export declare function getMaxSupply(chainId: ChainId): number | null;
export declare function estimatedSupplyAtHeight(chainId: ChainId, height: number): number | null;
export declare function getTargetBlockTimeSeconds(chainId: ChainId): number;
export declare function hashPerSecToKhPerMin(hashPerSec: number): number;
/** Matches wallet `resolveBlockTimeMinutes`: observed rate first, then RPC target. */
export declare function resolveVrmBlockTimeMinutes(blocksPerHour: number | null, blockTimeMinTarget: number | null): number | null;
export declare function fetchVrmHashrate(rpcCall: RpcCall, chainId?: ChainId): Promise<{
    currentHashPerSec: number | null;
    hashrate7dHashPerSec: number | null;
    blocksPerHour: number | null;
    blockTimeMinTarget: number | null;
}>;
