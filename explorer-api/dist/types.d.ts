export type ChainId = "vrm" | "vrc";
export interface TipState {
    height: number;
    hash: string;
    time: number;
}
export interface RpcCredentials {
    host: string;
    port: number;
    username?: string;
    password?: string;
    timeout?: number;
}
export declare const CHAIN_IDS: ChainId[];
export declare function parseChainId(value: string): ChainId | null;
