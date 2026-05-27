import type { RpcCredentials } from "../types.js";
export interface RpcClient {
    call<T = unknown>(method: string, params?: unknown[], timeoutMs?: number): Promise<T>;
    close(): Promise<void>;
}
export declare function createRpcPool(credentials: RpcCredentials): RpcClient;
