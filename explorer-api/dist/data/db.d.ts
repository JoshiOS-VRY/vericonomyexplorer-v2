import type Database from "better-sqlite3";
export declare function getDb(): Database.Database;
export declare function prepared(sql: string): Database.Statement;
export declare function getSyncTipHeight(chainId: string): number | null;
export declare function closeDb(): void;
