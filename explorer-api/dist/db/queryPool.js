import { Worker } from "node:worker_threads";
import path from "node:path";
import { loadEnv, repoRoot } from "../env.js";
loadEnv();
const workerCount = Math.max(1, Number(process.env.VCEXP_API_DB_WORKERS ?? 2));
const workerTimeoutMs = Number(process.env.VCEXP_API_DB_WORKER_TIMEOUT_MS ?? 60_000);
const workerFile = path.join(repoRoot, "explorer-api", "src", "db", "queryWorker.cjs");
class QueryWorkerSlot {
    worker;
    ready = false;
    busy = false;
    queue = [];
    pending = new Map();
    nextId = 1;
    constructor() {
        this.worker = new Worker(workerFile, {
            env: process.env,
        });
        this.worker.on("message", (message) => {
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
        this.worker.on("error", (error) => {
            for (const [, pending] of this.pending) {
                clearTimeout(pending.timer);
                pending.reject(error);
            }
            this.pending.clear();
            this.queue = [];
            this.busy = false;
        });
    }
    run(method, args, options) {
        return new Promise((resolve, reject) => {
            const id = this.nextId++;
            const timer = setTimeout(() => {
                this.pending.delete(id);
                this.busy = false;
                reject(new Error(`Query worker timed out after ${workerTimeoutMs}ms (${method})`));
                this.pump();
            }, workerTimeoutMs);
            this.queue.push({ id, method, args, options, resolve, reject, timer });
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
        await this.worker.terminate();
    }
}
class QueryPool {
    slots = [];
    roundRobin = 0;
    constructor(size) {
        for (let index = 0; index < size; index += 1) {
            this.slots.push(new QueryWorkerSlot());
        }
    }
    run(method, args, options = {}) {
        if (this.slots.length === 0) {
            return Promise.reject(new Error("Query worker pool is not initialized"));
        }
        const slot = this.slots[this.roundRobin % this.slots.length];
        this.roundRobin += 1;
        return slot.run(method, args, options);
    }
    async terminate() {
        await Promise.all(this.slots.map((slot) => slot.terminate()));
        this.slots = [];
    }
}
export const queryPool = new QueryPool(workerCount);
export async function runIndexerQuery(method, args, options = {}) {
    return queryPool.run(method, args, options);
}
