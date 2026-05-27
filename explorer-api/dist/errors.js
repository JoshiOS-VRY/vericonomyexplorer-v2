export class ApiError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
    }
}
export class WorkerTimeoutError extends ApiError {
    constructor(message) {
        super(message, 504);
        this.name = "WorkerTimeoutError";
    }
}
export function mapErrorToResponse(error) {
    if (error instanceof ApiError) {
        return { statusCode: error.statusCode, error: error.message };
    }
    if (error instanceof Error) {
        if (error.message.includes("Query worker timed out")) {
            return { statusCode: 504, error: error.message };
        }
        if (error.message === "Invalid chain id" || error.message === "Missing query") {
            return { statusCode: 400, error: error.message };
        }
    }
    return {
        statusCode: 500,
        error: error instanceof Error ? error.message : "Internal server error",
    };
}
