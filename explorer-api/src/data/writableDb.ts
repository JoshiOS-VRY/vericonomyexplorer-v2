import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { repoRoot } from '../env.js';

const requireRoot = createRequire(path.join(repoRoot, 'package.json'));

// Unified async db interface (get/all/run/runTransaction). Backed by Postgres
// or an augmented better-sqlite3 connection depending on VCEXP_DB_BACKEND.
export interface UnifiedDb {
  backend?: string;
  get(
    sql: string,
    params?: unknown[]
  ): Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined;
  all(
    sql: string,
    params?: unknown[]
  ): Promise<Record<string, unknown>[]> | Record<string, unknown>[];
  run(sql: string, params?: unknown[]): Promise<{ changes: number }> | { changes: number };
  runTransaction(fn: (db: UnifiedDb) => unknown): Promise<unknown>;
  prepare(sql: string): unknown;
  pragma?(value: string): void;
}

function backend(): string {
  return String(process.env.VCEXP_DB_BACKEND || 'sqlite').toLowerCase() === 'postgres'
    ? 'postgres'
    : 'sqlite';
}

let writableDb: UnifiedDb | null = null;

function getDatabasePath(): string {
  return (
    process.env.VCEXP_INDEXER_SQLITE_PATH ??
    process.env.BTCEXP_INDEXER_SQLITE_PATH ??
    path.join(repoRoot, 'database', 'vericonomy-index.sqlite')
  );
}

export function getWritableDb(): UnifiedDb {
  if (writableDb) {
    return writableDb;
  }

  if (backend() === 'postgres') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pgClient = requireRoot('./app/indexerV2/pgClient.js') as {
      openPostgres: () => UnifiedDb;
    };
    writableDb = pgClient.openPostgres();
    return writableDb;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DatabaseConstructor = requireRoot('better-sqlite3') as new (
    p: string
  ) => Record<string, (...a: unknown[]) => unknown>;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dbModule = requireRoot('./app/indexerV2/db.js') as {
    augmentSqlite: (db: unknown) => UnifiedDb;
  };

  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const raw = new DatabaseConstructor(dbPath) as unknown as {
    defaultSafeIntegers: (v: boolean) => void;
    pragma: (v: string) => void;
  };
  raw.defaultSafeIntegers(true);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');
  raw.pragma('busy_timeout = 10000');
  raw.pragma('synchronous = NORMAL');
  writableDb = dbModule.augmentSqlite(raw);

  return writableDb;
}

export async function getAddressCount(chainId: string): Promise<number | null> {
  try {
    const row = (await getWritableDb().get(
      `SELECT COUNT(*) AS count FROM address_balances WHERE chain_id = ?`,
      [chainId]
    )) as { count: number | bigint } | undefined;
    if (!row?.count) {
      return 0;
    }
    return typeof row.count === 'bigint' ? Number(row.count) : Number(row.count);
  } catch {
    return null;
  }
}
