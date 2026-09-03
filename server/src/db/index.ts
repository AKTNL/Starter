import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
// server/src/db -> repo root is three levels up.
const repoRoot = resolve(__dirname, '../../../');
// Honor DB_PATH (relative to repo root, e.g. "server/data/app.db"); fall back to it.
const dbPath = process.env.DB_PATH
  ? resolve(repoRoot, process.env.DB_PATH)
  : resolve(repoRoot, 'server/data/app.db');
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };
