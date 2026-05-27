declare class QueryPool {
    private slots;
    private roundRobin;
    constructor(size: number);
    run(method: string, args: unknown[], options?: Record<string, unknown>): Promise<unknown>;
    terminate(): Promise<void>;
}
export declare const queryPool: QueryPool;
export declare function runIndexerQuery<T>(method: string, args: unknown[], options?: Record<string, unknown>): Promise<T>;
export {};
