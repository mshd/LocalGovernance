import { Database } from "bun:sqlite";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DB_FILENAME = "bali-inaproc-2025.sqlite";

export const SOURCE_DB_PATH = path.join(
  process.cwd(),
  "data",
  "raw",
  DB_FILENAME,
);

const RUNTIME_DB_PATH = path.join(tmpdir(), "mapthebudget", DB_FILENAME);

let db: Database | null = null;

function bundledDbExists(): boolean {
  return existsSync(SOURCE_DB_PATH);
}

function ensureRuntimeDb(): string {
  if (process.env.VERCEL !== "1") {
    return SOURCE_DB_PATH;
  }

  if (!existsSync(RUNTIME_DB_PATH)) {
    mkdirSync(path.dirname(RUNTIME_DB_PATH), { recursive: true });
    copyFileSync(SOURCE_DB_PATH, RUNTIME_DB_PATH);
  }

  return RUNTIME_DB_PATH;
}

export function isDbAvailable(): boolean {
  return bundledDbExists();
}

export function getDb(): Database {
  if (!isDbAvailable()) {
    throw new Error(`SQLite database not found at ${SOURCE_DB_PATH}`);
  }

  if (!db) {
    const dbPath = ensureRuntimeDb();
    db = new Database(dbPath, { readonly: true });
  }

  return db;
}
