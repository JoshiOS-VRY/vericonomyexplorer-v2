export class TimeoutError extends Error {
    constructor(label, timeoutMs) {
        super(`${label} timed out after ${timeoutMs}ms`);
        this.name = "TimeoutError";
    }
}
export function withTimeout(promise, timeoutMs, label = "operation") {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        return promise;
    }
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new TimeoutError(label, timeoutMs));
        }, timeoutMs);
        promise.then((value) => {
            clearTimeout(timer);
            resolve(value);
        }, (error) => {
            clearTimeout(timer);
            reject(error);
        });
    });
}
