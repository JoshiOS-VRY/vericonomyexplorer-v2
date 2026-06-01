import type { ChainId } from "../types.js";
/** Legacy `ExplorerStats` shape (snake_case) the wallet deserializes directly. */
export interface WalletStats {
    network_hash: number | null;
    supply: number | null;
    height: number | null;
    block_reward: number | null;
    difficulty: number | null;
    blocks_per_hour: number | null;
    block_time_min: number | null;
    pooled_tx: number | null;
    price_usd: number | null;
    price_btc: number | null;
    market_cap_usd: number | null;
    volume_24h_usd: number | null;
    stake_interest: number | null;
    stake_inflation: number | null;
    net_stake_weight: number | null;
    pos_difficulty: number | null;
    pow_difficulty: number | null;
    fetched_at: number;
    source: string;
}
export declare function buildWalletStats(chainId: ChainId): Promise<WalletStats>;
/** Legacy block object shape consumed by the wallet's `fetch_blocks`. */
export interface WalletBlock {
    id: number;
    hash: string;
    height: number;
    time: number;
    mint: string | null;
    difficulty: string | null;
    nTx: number | null;
    miner: {
        address: string | null;
    };
    strippedsize: number | null;
    outputT: string | null;
    outputC: number | null;
}
export declare function buildWalletBlocks(chainId: ChainId, limit: number): Promise<WalletBlock[]>;
/** Legacy transaction object shape consumed by the wallet's `fetch_transactions`. */
export interface WalletTransaction {
    id: number;
    txid: string;
    time: number;
    fee: string | null;
    outputT: string | null;
    blocks: Array<{
        height: number | null;
        hash: string | null;
    }>;
}
export declare function buildWalletTransactions(chainId: ChainId, limit: number): Promise<WalletTransaction[]>;
/** Legacy extraction (top miners) shape consumed by the wallet's `fetch_extraction`. */
export interface WalletExtractionEntry {
    rank: string | null;
    address: string;
    count: string | null;
}
export declare function buildWalletExtraction(chainId: ChainId, limit: number, period?: string): Promise<WalletExtractionEntry[]>;
/** Legacy chain-tips shape consumed by the wallet's `fetch_chain_tips`. */
export interface WalletChainTip {
    id: number;
    height: number;
    hash: string;
    branchlen: number;
    status: {
        name: string | null;
    };
}
export declare function buildWalletChainTips(chainId: ChainId): Promise<WalletChainTip[]>;
/** Legacy peer shape (snake_case) the wallet deserializes directly. */
export interface WalletPeer {
    id: number;
    address: string;
    ip: string;
    port: number;
    subversion: string;
    protocol_version: number;
    connected_on_explorer: boolean;
    last_seen: string | null;
}
export declare function buildWalletPeers(chainId: ChainId, limit: number): Promise<WalletPeer[]>;
