export declare class ApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare class WorkerTimeoutError extends ApiError {
    constructor(message: string);
}
export declare function mapErrorToResponse(error: unknown): {
    statusCode: number;
    error: string;
};
