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
export function isSqliteBusyError(error) {
    if (!(error instanceof Error)) {
        return false;
    }
    const message = error.message.toLowerCase();
    return message.includes("database is locked") || message.includes("sqlite_busy");
}
function isTooManyRequestsError(error) {
    if (error instanceof Error) {
        return error.message === "Too many requests";
    }
    if (typeof error === "object" && error !== null && "error" in error) {
        return error.error === "Too many requests";
    }
    return false;
}
export function mapErrorToResponse(error) {
    if (error instanceof ApiError) {
        return { statusCode: error.statusCode, error: error.message };
    }
    if (isTooManyRequestsError(error)) {
        return { statusCode: 429, error: "Too many requests" };
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
