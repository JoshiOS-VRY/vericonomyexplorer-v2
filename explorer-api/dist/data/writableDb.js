import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
const requireRoot = createRequire(path.join(repoRoot, "package.json"));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dbModule = requireRoot("./app/indexerV2/db.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DatabaseConstructor = requireRoot("better-sqlite3");
let writableDb = null;
let migrationsApplied = false;
function getDatabasePath() {
    return (process.env.VCEXP_INDEXER_SQLITE_PATH ??
        process.env.BTCEXP_INDEXER_SQLITE_PATH ??
        path.join(repoRoot, "database", "vericonomy-index.sqlite"));
}
export function getWritableDb() {
    if (writableDb) {
        return writableDb;
    }
    const dbPath = getDatabasePath();
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!migrationsApplied) {
        dbModule.ensureDatabaseMigrations(dbPath);
        migrationsApplied = true;
    }
    writableDb = new DatabaseConstructor(dbPath);
    writableDb.defaultSafeIntegers(true);
    writableDb.pragma("journal_mode = WAL");
    writableDb.pragma("foreign_keys = ON");
    writableDb.pragma("busy_timeout = 10000");
    writableDb.pragma("synchronous = NORMAL");
    return writableDb;
}
export function getAddressCount(chainId) {
    try {
        const row = getWritableDb()
            .prepare(`SELECT COUNT(*) AS count FROM address_balances WHERE chain_id = ?`)
            .get(chainId);
        if (!row?.count) {
            return 0;
        }
        return typeof row.count === "bigint" ? Number(row.count) : Number(row.count);
    }
    catch {
        return null;
    }
}
