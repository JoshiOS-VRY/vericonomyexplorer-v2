export declare function resolveQueryPriority(method: string, queryOptions?: {
    priority?: number;
}): number;
export declare const queryPool: {
    run(method: string, args: unknown[], options?: Record<string, unknown>, timeoutMs?: number, priority?: number): Promise<unknown>;
    terminate(): Promise<void>;
};
export declare function runIndexerQuery<T>(method: string, args: unknown[], options?: Record<string, unknown>, queryOptions?: {
    coalesce?: boolean;
    timeoutMs?: number;
    retryOnWorkerError?: boolean;
    priority?: number;
}): Promise<T>;
export declare const searchQueryTimeoutMs: number;
export declare const txLookupTimeoutMs: number;
