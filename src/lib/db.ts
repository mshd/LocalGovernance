import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import path from "node:path";

export const SOURCE_DB_PATH = path.join(
  process.cwd(),
  "data",
  "raw",
  "bali-inaproc-2025.sqlite",
);

let db: Database | null = null;

export function isDbAvailable(): boolean {
  return existsSync(SOURCE_DB_PATH);
}

export function getDb(): Database {
  if (!isDbAvailable()) {
    throw new Error(`SQLite database not found at ${SOURCE_DB_PATH}`);
  }
  if (!db) {
    db = new Database(SOURCE_DB_PATH, { readonly: true });
  }
  return db;
}
