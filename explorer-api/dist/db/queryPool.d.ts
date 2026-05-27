export declare const queryPool: {
    run(method: string, args: unknown[], options?: Record<string, unknown>, timeoutMs?: number): Promise<unknown>;
    terminate(): Promise<void>;
};
export declare function runIndexerQuery<T>(method: string, args: unknown[], options?: Record<string, unknown>, queryOptions?: {
    coalesce?: boolean;
    timeoutMs?: number;
    retryOnWorkerError?: boolean;
}): Promise<T>;
export declare const searchQueryTimeoutMs: number;
