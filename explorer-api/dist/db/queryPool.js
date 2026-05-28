import os from "node:os";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { loadEnv, repoRoot } from "../env.js";
import { WorkerTimeoutError } from "../errors.js";
loadEnv();
function defaultWorkerCount() {
    const configured = Number(process.env.VCEXP_API_DB_WORKERS);
    if (Number.isFinite(configured) && configured > 0) {
        return configured;
    }
    return Math.min(Math.max(2, os.cpus().length * 2), 8);
}
const workerCount = defaultWorkerCount();
const defaultWorkerTimeoutMs = Number(process.env.VCEXP_API_DB_WORKER_TIMEOUT_MS ?? 120_000);
const workerFile = path.join(repoRoot, "explorer-api", "src", "db", "queryWorker.cjs");
class QueryWorkerSlot {
    onFatalError;
    worker;
    ready = false;
    busy = false;
    queue = [];
    pending = new Map();
    nextId = 1;
    terminated = false;
    constructor(onFatalError) {
        this.onFatalError = onFatalError;
        this.worker = this.createWorker();
    }
    createWorker() {
        const worker = new Worker(workerFile, {
            env: process.env,
        });
        worker.on("message", (message) => {
            if (message.ready) {
                this.ready = true;
                this.pump();
                return;
            }
            const pending = this.pending.get(message.id);
            if (!pending) {
                return;
            }
            clearTimeout(pending.timer);
            this.pending.delete(message.id);
            if (message.error) {
                pending.reject(new Error(message.error));
            }
            else {
                pending.resolve(message.result);
            }
            this.busy = false;
            this.pump();
        });
        worker.on("error", (error) => {
            this.failPending(error);
            if (!this.terminated) {
                this.onFatalError();
                this.respawn();
            }
        });
        worker.on("exit", (code) => {
            if (code !== 0 && !this.terminated) {
                this.failPending(new Error(`Query worker exited with code ${code}`));
                this.onFatalError();
                this.respawn();
            }
        });
        return worker;
    }
    failPending(error) {
        for (const [, pending] of this.pending) {
            clearTimeout(pending.timer);
            pending.reject(error);
        }
        this.pending.clear();
        for (const queued of this.queue) {
            clearTimeout(queued.timer);
            queued.reject(error);
        }
        this.queue = [];
        this.busy = false;
    }
    respawn() {
        this.ready = false;
        this.worker = this.createWorker();
    }
    getQueueDepth() {
        return this.queue.length + (this.busy ? 1 : 0);
    }
    run(method, args, options, timeoutMs = defaultWorkerTimeoutMs) {
        return new Promise((resolve, reject) => {
            const id = this.nextId++;
            const timer = setTimeout(() => {
                this.pending.delete(id);
                this.busy = false;
                reject(new WorkerTimeoutError(`Query worker timed out after ${timeoutMs}ms (${method})`));
                this.pump();
            }, timeoutMs);
            this.queue.push({ id, method, args, options, resolve, reject, timer, timeoutMs });
            this.pump();
        });
    }
    pump() {
        if (!this.ready || this.busy || this.queue.length === 0) {
            return;
        }
        const next = this.queue.shift();
        if (!next) {
            return;
        }
        this.busy = true;
        this.pending.set(next.id, {
            resolve: next.resolve,
            reject: next.reject,
            timer: next.timer,
        });
        this.worker.postMessage({
            id: next.id,
            method: next.method,
            args: next.args,
            options: next.options,
        });
    }
    async terminate() {
        this.terminated = true;
        await this.worker.terminate();
    }
}
class QueryPool {
    slots = [];
    constructor(size) {
        for (let index = 0; index < size; index += 1) {
            this.slots.push(new QueryWorkerSlot(() => {
                /* slot respawns itself */
            }));
        }
    }
    run(method, args, options = {}, timeoutMs = defaultWorkerTimeoutMs) {
        if (this.slots.length === 0) {
            return Promise.reject(new Error("Query worker pool is not initialized"));
        }
        let slot = this.slots[0];
        let lowestDepth = slot.getQueueDepth();
        for (const candidate of this.slots) {
            const depth = candidate.getQueueDepth();
            if (depth < lowestDepth) {
                slot = candidate;
                lowestDepth = depth;
            }
        }
        return slot.run(method, args, options, timeoutMs);
    }
    async terminate() {
        await Promise.all(this.slots.map((slot) => slot.terminate()));
        this.slots = [];
    }
}
let queryPoolInstance = null;
const inFlight = new Map();
function getQueryPool() {
    if (!queryPoolInstance) {
        queryPoolInstance = new QueryPool(workerCount);
    }
    return queryPoolInstance;
}
function buildCoalesceKey(method, args, options) {
    return `${method}:${JSON.stringify(args)}:${JSON.stringify(options)}`;
}
export const queryPool = {
    run(method, args, options = {}, timeoutMs = defaultWorkerTimeoutMs) {
        return getQueryPool().run(method, args, options, timeoutMs);
    },
    terminate() {
        if (!queryPoolInstance) {
            return Promise.resolve();
        }
        return queryPoolInstance.terminate();
    },
};
export async function runIndexerQuery(method, args, options = {}, queryOptions = {}) {
    const coalesce = queryOptions.coalesce !== false;
    const timeoutMs = queryOptions.timeoutMs ?? defaultWorkerTimeoutMs;
    const key = buildCoalesceKey(method, args, options);
    if (coalesce) {
        const existing = inFlight.get(key);
        if (existing) {
            return existing;
        }
    }
    const execute = async () => {
        try {
            return (await queryPool.run(method, args, options, timeoutMs));
        }
        catch (error) {
            if (queryOptions.retryOnWorkerError !== false && error instanceof Error) {
                const retriable = error.message.includes("Query worker exited") ||
                    error.message.includes("Unknown query worker method");
                if (retriable) {
                    return (await queryPool.run(method, args, options, timeoutMs));
                }
            }
            throw error;
        }
    };
    const promise = execute().finally(() => {
        if (coalesce) {
            inFlight.delete(key);
        }
    });
    if (coalesce) {
        inFlight.set(key, promise);
    }
    return promise;
}
export const searchQueryTimeoutMs = Number(process.env.VCEXP_API_SEARCH_TIMEOUT_MS ?? 15_000);
