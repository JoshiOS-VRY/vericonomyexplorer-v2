export declare const queryPool: {
    run(method: string, args: unknown[], options?: Record<string, unknown>): Promise<unknown>;
    terminate(): Promise<void>;
};
export declare function runIndexerQuery<T>(method: string, args: unknown[], options?: Record<string, unknown>): Promise<T>;
