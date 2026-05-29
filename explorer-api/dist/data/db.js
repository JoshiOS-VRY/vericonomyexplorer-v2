import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
const requireRoot = createRequire(path.join(repoRoot, "package.json"));
// Use the repo-root native module so explorer-api matches indexer/Express Node ABI.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DatabaseConstructor = requireRoot("better-sqlite3");
const statementCache = new Map();
let dbInstance = null;
let dbError = null;
function getDatabasePath() {
    return (process.env.VCEXP_INDEXER_SQLITE_PATH ??
        process.env.BTCEXP_INDEXER_SQLITE_PATH ??
        path.join(repoRoot, "database", "vericonomy-index.sqlite"));
}
export function getDb() {
    if (dbInstance)
        return dbInstance;
    if (dbError)
        throw dbError;
    try {
        const dbPath = getDatabasePath();
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        dbInstance = new DatabaseConstructor(dbPath, { readonly: true });
        dbInstance.defaultSafeIntegers(true);
        dbInstance.pragma("foreign_keys = ON");
        dbInstance.pragma("busy_timeout = 10000");
        return dbInstance;
    }
    catch (err) {
        dbError = err instanceof Error ? err : new Error(String(err));
        throw dbError;
    }
}
export function prepared(sql) {
    const db = getDb();
    const cached = statementCache.get(sql);
    if (cached)
        return cached;
    const stmt = db.prepare(sql);
    statementCache.set(sql, stmt);
    return stmt;
}
export function getSyncTipHeight(chainId) {
    try {
        const row = prepared(`
      SELECT best_rpc_height AS height
      FROM sync_state
      WHERE chain_id = ?
    `).get(chainId);
        if (row?.height == null)
            return null;
        return typeof row.height === "bigint" ? Number(row.height) : Number(row.height);
    }
    catch {
        return null;
    }
}
export function closeDb() {
    if (!dbInstance)
        return;
    dbInstance.close();
    dbInstance = null;
    dbError = null;
    statementCache.clear();
}
