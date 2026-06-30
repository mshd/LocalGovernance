import { Database } from "bun:sqlite";
import { copyFileSync } from "node:fs";
import path from "node:path";

const SOURCE_DB = path.join("data", "raw", "bali-inaproc-2025.sqlite");
const OUTPUT_DB = path.join("data", "raw", "bali-inaproc-2025.deploy.sqlite");

copyFileSync(SOURCE_DB, OUTPUT_DB);

const db = new Database(OUTPUT_DB);
db.run("PRAGMA journal_mode=DELETE");
db.run("VACUUM");
db.close();

const check = new Database(OUTPUT_DB, { readonly: true });
const journalMode = (check.query("PRAGMA journal_mode").get() as { journal_mode: string })
  .journal_mode;
const count = (check.query("SELECT COUNT(*) AS n FROM realisasi").get() as { n: number }).n;
check.close();

console.log(`Wrote ${OUTPUT_DB}`);
console.log(`journal_mode=${journalMode}, realisasi rows=${count}`);
console.log(
  "Optional: replace bali-inaproc-2025.sqlite with this file to avoid copying ~54MB to /tmp on each Vercel cold start.",
);
