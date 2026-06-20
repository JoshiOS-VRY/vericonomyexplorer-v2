import os from 'node:os';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { loadEnv, repoRoot } from '../env.js';
import { isSqliteBusyError, WorkerTimeoutError } from '../errors.js';

loadEnv();

interface WorkerResponse {
  id: number;
  result?: unknown;
  error?: string;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

interface QueuedRequest {
  id: number;
  method: string;
  args: unknown[];
  options: Record<string, unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
  timeoutMs: number;
  priority: number;
}

/** Entity lookups that must stay fast even when summary/dashboard queries saturate workers. */
const FAST_QUERY_METHODS = new Set([
  'getTransaction',
  'getBlockIndexed',
  'getTransactionRelatedAddresses',
]);

const METHOD_PRIORITY: Record<string, number> = {
  getTransaction: 0,
  getBlockIndexed: 0,
  getTransactionRelatedAddresses: 0,
  getAddress: 1,
  getRichlist: 1,
  getLeaderboard: 1,
  getMinedLeaderboard: 1,
  getMinerShareTrend: 1,
  getMinerBlockDistribution: 1,
  getChainHealth: 1,
  getAddressBalanceHistory: 1,
  getAddressUtxos: 1,
  enrichBlockInterestRatesIndexed: 1,
  getChainSummaryIndexed: 2,
  getChainSummaryLiteIndexed: 1,
  getChainActivityHistory: 1,
  getLatestBlocksIndexed: 2,
  getBlocksPageIndexed: 1,
  getLandingBundle: 2,
  getVrmDashboardBundle: 2,
  getIndexerHealthIndexed: 2,
  getNetworkMetricHistory: 2,
  getIndexedSupplyAtHeight: 1,
  getIndexedHashrate7dAvg: 1,
};

function defaultWorkerCount(): number {
  const configured = Number(process.env.VCEXP_API_DB_WORKERS);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return Math.min(Math.max(2, os.cpus().length * 2), 8);
}

function defaultFastWorkerCount(totalWorkers: number): number {
  const configured = Number(process.env.VCEXP_API_DB_FAST_WORKERS);
  if (Number.isFinite(configured) && configured >= 0) {
    return Math.min(configured, Math.max(0, totalWorkers - 1));
  }

  if (totalWorkers <= 1) {
    return 0;
  }

  // Keep at least one fast worker so block/tx lookups are not queued behind dashboards.
  return Math.min(2, Math.max(1, Math.floor(totalWorkers / 2)));
}

const totalWorkerCount = defaultWorkerCount();
const fastWorkerCount = defaultFastWorkerCount(totalWorkerCount);
const mainWorkerCount = Math.max(1, totalWorkerCount - fastWorkerCount);
const defaultWorkerTimeoutMs = Number(process.env.VCEXP_API_DB_WORKER_TIMEOUT_MS ?? 45_000);
const sqliteBusyRetryAttempts = Number(process.env.VCEXP_SQLITE_BUSY_RETRY_ATTEMPTS ?? 4);
const sqliteBusyRetryDelayMs = Number(process.env.VCEXP_SQLITE_BUSY_RETRY_DELAY_MS ?? 75);
const workerFile = path.join(repoRoot, 'explorer-api', 'src', 'db', 'queryWorker.cjs');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function resolveQueryPriority(
  method: string,
  queryOptions: { priority?: number } = {}
): number {
  if (typeof queryOptions.priority === 'number') {
    return queryOptions.priority;
  }

  return METHOD_PRIORITY[method] ?? 1;
}

class QueryWorkerSlot {
  private worker: Worker;
  private ready = false;
  private busy = false;
  private queue: QueuedRequest[] = [];
  private pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private terminated = false;
  private respawning = false;

  constructor(private readonly onFatalError: () => void) {
    this.worker = this.createWorker();
  }

  private createWorker(): Worker {
    const worker = new Worker(workerFile, {
      env: process.env,
    });

    worker.on('message', (message: WorkerResponse & { ready?: boolean }) => {
      if (message.ready) {
        this.ready = true;
        this.respawning = false;
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
      } else {
        pending.resolve(message.result);
      }

      this.busy = false;
      this.pump();
    });

    worker.on('error', (error) => {
      this.failPending(error instanceof Error ? error : new Error(String(error)));
      if (!this.terminated) {
        this.onFatalError();
        this.respawn();
      }
    });

    worker.on('exit', (code) => {
      if (code !== 0 && !this.terminated && !this.respawning) {
        this.failPending(new Error(`Query worker exited with code ${code}`));
        this.onFatalError();
        this.respawn();
      }
    });

    return worker;
  }

  private failPending(error: Error): void {
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

  private respawn(): void {
    this.ready = false;
    this.respawning = true;
    this.worker = this.createWorker();
  }

  private async recycleWorkerAfterTimeout(): Promise<void> {
    this.respawning = true;
    this.ready = false;
    try {
      await this.worker.terminate();
    } catch {
      /* worker may already be gone */
    }
    if (!this.terminated) {
      this.respawn();
    }
  }

  getQueueDepth(): number {
    return this.queue.length + (this.busy ? 1 : 0);
  }

  run(
    method: string,
    args: unknown[],
    options: Record<string, unknown>,
    timeoutMs = defaultWorkerTimeoutMs,
    priority = 1
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.busy = false;
        reject(new WorkerTimeoutError(`Query worker timed out after ${timeoutMs}ms (${method})`));
        void this.recycleWorkerAfterTimeout();
      }, timeoutMs);

      this.queue.push({
        id,
        method,
        args,
        options,
        resolve,
        reject,
        timer,
        timeoutMs,
        priority,
      });
      this.pump();
    });
  }

  private dequeueNext(): QueuedRequest | undefined {
    if (this.queue.length === 0) {
      return undefined;
    }

    let bestIdx = 0;
    for (let index = 1; index < this.queue.length; index += 1) {
      if (this.queue[index].priority < this.queue[bestIdx].priority) {
        bestIdx = index;
      }
    }

    return this.queue.splice(bestIdx, 1)[0];
  }

  private pump(): void {
    if (!this.ready || this.busy || this.queue.length === 0) {
      return;
    }

    const next = this.dequeueNext();
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

  async terminate(): Promise<void> {
    this.terminated = true;
    await this.worker.terminate();
  }
}

class QueryPool {
  private slots: QueryWorkerSlot[] = [];

  constructor(size: number) {
    for (let index = 0; index < size; index += 1) {
      this.slots.push(
        new QueryWorkerSlot(() => {
          /* slot respawns itself */
        })
      );
    }
  }

  run(
    method: string,
    args: unknown[],
    options: Record<string, unknown> = {},
    timeoutMs = defaultWorkerTimeoutMs,
    priority = 1
  ): Promise<unknown> {
    if (this.slots.length === 0) {
      return Promise.reject(new Error('Query worker pool is not initialized'));
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

    return slot.run(method, args, options, timeoutMs, priority);
  }

  async terminate(): Promise<void> {
    await Promise.all(this.slots.map((slot) => slot.terminate()));
    this.slots = [];
  }
}

let fastQueryPoolInstance: QueryPool | null = null;
let mainQueryPoolInstance: QueryPool | null = null;
const inFlight = new Map<string, Promise<unknown>>();

function getFastQueryPool(): QueryPool {
  if (!fastQueryPoolInstance) {
    fastQueryPoolInstance = new QueryPool(fastWorkerCount);
  }
  return fastQueryPoolInstance;
}

function getMainQueryPool(): QueryPool {
  if (!mainQueryPoolInstance) {
    mainQueryPoolInstance = new QueryPool(mainWorkerCount);
  }
  return mainQueryPoolInstance;
}

function getQueryPoolForMethod(method: string): QueryPool {
  if (FAST_QUERY_METHODS.has(method) && fastWorkerCount > 0) {
    return getFastQueryPool();
  }

  return getMainQueryPool();
}

function buildCoalesceKey(
  method: string,
  args: unknown[],
  options: Record<string, unknown>
): string {
  return `${method}:${JSON.stringify(args)}:${JSON.stringify(options)}`;
}

export const queryPool = {
  run(
    method: string,
    args: unknown[],
    options: Record<string, unknown> = {},
    timeoutMs = defaultWorkerTimeoutMs,
    priority = 1
  ): Promise<unknown> {
    return getQueryPoolForMethod(method).run(method, args, options, timeoutMs, priority);
  },
  async terminate(): Promise<void> {
    await Promise.all([fastQueryPoolInstance?.terminate(), mainQueryPoolInstance?.terminate()]);
    fastQueryPoolInstance = null;
    mainQueryPoolInstance = null;
  },
};

export async function runIndexerQuery<T>(
  method: string,
  args: unknown[],
  options: Record<string, unknown> = {},
  queryOptions: {
    coalesce?: boolean;
    timeoutMs?: number;
    retryOnWorkerError?: boolean;
    priority?: number;
  } = {}
): Promise<T> {
  const coalesce = queryOptions.coalesce !== false;
  const timeoutMs = queryOptions.timeoutMs ?? defaultWorkerTimeoutMs;
  const priority = resolveQueryPriority(method, queryOptions);
  const key = buildCoalesceKey(method, args, options);

  if (coalesce) {
    const existing = inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  const execute = async (): Promise<T> => {
    const maxAttempts = Math.max(1, sqliteBusyRetryAttempts);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return (await queryPool.run(method, args, options, timeoutMs, priority)) as T;
      } catch (error) {
        if (isSqliteBusyError(error) && attempt < maxAttempts) {
          await sleep(sqliteBusyRetryDelayMs * attempt);
          continue;
        }

        if (queryOptions.retryOnWorkerError !== false && error instanceof Error) {
          const retriable =
            error.message.includes('Query worker exited') ||
            error.message.includes('Unknown query worker method');
          if (retriable) {
            return (await queryPool.run(method, args, options, timeoutMs, priority)) as T;
          }
        }

        throw error;
      }
    }

    throw new Error(`Query failed after ${maxAttempts} attempts (${method})`);
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

export const txLookupTimeoutMs = Number(process.env.VCEXP_API_TX_LOOKUP_TIMEOUT_MS ?? 30_000);
