import type Database from "better-sqlite3";
export declare function getWritableDb(): Database.Database;
export declare function getAddressCount(chainId: string): number | null;
