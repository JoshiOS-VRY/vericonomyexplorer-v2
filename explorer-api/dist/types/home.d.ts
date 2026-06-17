import type { ChainId } from '../types.js';
export interface PriceHistoryPoint {
    time: number;
    value: number;
}
export interface ChainMarket {
    usd: number | null;
    btc: number | null;
    marketCap: number | null;
    volume24h: number | null;
    change24h: number | null;
    circulatingSupply: number | null;
    source: 'livecoinwatch' | 'coingecko' | 'computed' | 'unavailable';
    updatedAt: string | null;
    priceHistory24h: PriceHistoryPoint[];
}
export interface VrmNetworkStats {
    hashrateKhPerMin: number | null;
    /** How hashrateKhPerMin was derived (debug / cross-site parity). */
    hashrateSource?: 'recent_blocks' | 'blocks_per_hour' | 'recent_blocks_extended' | 'networkhashps' | 'nethashrate' | 'difficulty' | null;
    avgBlockTimeMin: number | null;
    blocksPerHour: number | null;
    difficulty: number | null;
    blocks: number | null;
    supply: number | null;
    maxSupply: number | null;
}
export interface VrmNetworkHashratePayload {
    hashPerSec: number | null;
    hashrateKhPerMin: number | null;
    source: 'recent_blocks' | 'blocks_per_hour' | 'recent_blocks_extended' | 'networkhashps' | 'nethashrate' | 'difficulty' | null;
    difficulty: number | null;
    fetchedAt: string;
}
export interface VrcNetworkStats {
    difficulty: number | null;
    blocks: number | null;
    supply: number | null;
    maxSupply: number | null;
    interestRatePercent: number | null;
    netStakeWeight: number | null;
    percentStaked: number | null;
    expectedStakeTimeSeconds: number | null;
}
export interface HomeChainSection {
    summary: Record<string, unknown>;
    richlist: Record<string, unknown>;
    market: ChainMarket;
    network: VrmNetworkStats | VrcNetworkStats;
}
export interface HomePayload {
    vrm: HomeChainSection & {
        network: VrmNetworkStats;
    };
    vrc: HomeChainSection & {
        network: VrcNetworkStats;
    };
    vrmLeaderboard: Record<string, unknown>;
    fetchedAt: string;
}
export interface HomeMarketPayload {
    vrm: ChainMarket;
    vrc: ChainMarket;
    fetchedAt: string;
}
export interface HomeShellPayload {
    vrm: {
        summary: Record<string, unknown>;
        richlist: Record<string, unknown>;
    };
    vrc: {
        summary: Record<string, unknown>;
        richlist: Record<string, unknown>;
    };
    vrmLeaderboard: Record<string, unknown>;
    fetchedAt: string;
}
export interface HomeNetworkPayload {
    vrm: VrmNetworkStats;
    vrc: VrcNetworkStats;
    fetchedAt: string;
}
export declare const LCW_CHAIN_CODES: Record<ChainId, string>;
