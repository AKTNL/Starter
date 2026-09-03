# Database Guidelines

> Database patterns and conventions for this project.

---

## Overview

- **Engine**: SQLite via `better-sqlite3` (native module, prebuilt for Node 22).
- **ORM**: Drizzle ORM (`drizzle-orm/better-sqlite3`).
- **Schema**: defined in `server/src/db/schema.ts` (single `users` table for now).
- **Migrations**: the table is created at runtime with `CREATE TABLE IF NOT EXISTS` in `server/src/db/index.ts`. `drizzle-kit` is configured but **not required to boot** — do not add a mandatory migration step unless the schema grows.

## Connection & Pragmas

- Open the DB once per process in `db/index.ts`.
- Enable WAL: `sqlite.pragma('journal_mode = WAL')`.
- Enable FK checks: `sqlite.pragma('foreign_keys = ON')`.

## DB Path & Secrets

- The DB file path is controlled by `DB_PATH` (relative to repo root, default `server/data/app.db`). `db/index.ts` resolves it against the repo root so it lands in `server/data/`, which is git-ignored.
- **Never** hardcode a path that places the DB inside `server/src/` — it leaks into source trees and won't match `.gitignore`'s `server/data/` rule.
- The `.env` file is git-ignored; `.env.example` is committed. Real secrets never enter the repo.

## Query Patterns

- Use Drizzle query builders (`db.select().from(users).where(eq(...)).get()`).
- `better-sqlite3` is synchronous — `await` is only needed for async work (argon2, jwt). Wrap inserts/selects in `.run()` / `.get()` synchronously.

## Naming Conventions

- Table: `users` (plural). Columns are `snake_case` in SQL (`password_hash`, `created_at`) but mapped to camelCase TS fields in the Drizzle schema (`passwordHash`, `createdAt`).
- `id` is **TEXT / UUID** (not auto-increment int) — see Quality Guidelines.

## Common Mistakes

- Putting the DB at `server/src/data/` instead of `server/data/` (breaks gitignore + env contract).
- Relying on `drizzle-kit generate` before boot — the runtime `CREATE TABLE` is intentional; keep boot dependency-free.
- Committing seed data or the `.db` file (caught by `.gitignore`; verify with `git check-ignore`).
