import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { repoRoot } from '../env.js';
const requireRoot = createRequire(path.join(repoRoot, 'package.json'));
function backend() {
    return String(process.env.VCEXP_DB_BACKEND || 'sqlite').toLowerCase() === 'postgres'
        ? 'postgres'
        : 'sqlite';
}
let writableDb = null;
function getDatabasePath() {
    return (process.env.VCEXP_INDEXER_SQLITE_PATH ??
        process.env.BTCEXP_INDEXER_SQLITE_PATH ??
        path.join(repoRoot, 'database', 'vericonomy-index.sqlite'));
}
export function getWritableDb() {
    if (writableDb) {
        return writableDb;
    }
    if (backend() === 'postgres') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pgClient = requireRoot('./app/indexerV2/pgClient.js');
        writableDb = pgClient.openPostgres();
        return writableDb;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DatabaseConstructor = requireRoot('better-sqlite3');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dbModule = requireRoot('./app/indexerV2/db.js');
    const dbPath = getDatabasePath();
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const raw = new DatabaseConstructor(dbPath);
    raw.defaultSafeIntegers(true);
    raw.pragma('journal_mode = WAL');
    raw.pragma('foreign_keys = ON');
    raw.pragma('busy_timeout = 10000');
    raw.pragma('synchronous = NORMAL');
    writableDb = dbModule.augmentSqlite(raw);
    return writableDb;
}
export async function getAddressCount(chainId) {
    try {
        const row = (await getWritableDb().get(`SELECT COUNT(*) AS count FROM address_balances WHERE chain_id = ?`, [chainId]));
        if (!row?.count) {
            return 0;
        }
        return typeof row.count === 'bigint' ? Number(row.count) : Number(row.count);
    }
    catch {
        return null;
    }
}
