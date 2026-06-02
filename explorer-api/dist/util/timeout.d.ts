export declare class TimeoutError extends Error {
    constructor(label: string, timeoutMs: number);
}
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label?: string): Promise<T>;
