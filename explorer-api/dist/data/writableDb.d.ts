export interface UnifiedDb {
    backend?: string;
    get(sql: string, params?: unknown[]): Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined;
    all(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]> | Record<string, unknown>[];
    run(sql: string, params?: unknown[]): Promise<{
        changes: number;
    }> | {
        changes: number;
    };
    runTransaction(fn: (db: UnifiedDb) => unknown): Promise<unknown>;
    prepare(sql: string): unknown;
    pragma?(value: string): void;
}
export declare function getWritableDb(): UnifiedDb;
export declare function getAddressCount(chainId: string): Promise<number | null>;
