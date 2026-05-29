export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export class WorkerTimeoutError extends ApiError {
  constructor(message: string) {
    super(message, 504);
    this.name = "WorkerTimeoutError";
  }
}

export function isSqliteBusyError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("database is locked") || message.includes("sqlite_busy");
}

export function mapErrorToResponse(error: unknown): { statusCode: number; error: string } {
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
