# Directory Structure

> How backend code is organized in this project.

---

## Overview

The backend is a **standalone TypeScript project** at the repo-root `server/` directory. It is **not** a monorepo package — it has its own `package.json` and `node_modules`, and is run from the root via `npm run dev:server` (`npm --prefix server run dev`).

Code is organized by concern: `db/` (data layer), `auth/` (security primitives), `routes/` (HTTP handlers). Keep HTTP handlers thin — delegate logic to `db`/`auth`.

## Directory Layout

```
server/
├── src/
│   ├── index.ts            # Express bootstrap, mounts /api, health check, fail-fast secret check
│   ├── env.ts              # Loads repo-root .env via dotenv (path: ../../.env)
│   ├── db/
│   │   ├── index.ts        # better-sqlite3 connection + Drizzle instance + runtime CREATE TABLE
│   │   └── schema.ts       # Drizzle `users` table definition
│   ├── auth/
│   │   ├── jwt.ts          # jose sign/verify for access + refresh tokens
│   │   ├── middleware.ts   # requireAuth guard -> AuthRequest
│   │   └── passwords.ts    # argon2id hash/verify
│   └── routes/
│       └── auth.ts         # 4 auth endpoints (/auth/login, /register, /me, /refresh)
├── scripts/
│   └── seed.ts             # Idempotent seed: admin@demo.com / secret123
├── drizzle.config.ts       # drizzle-kit config (optional migrations, not required to boot)
├── package.json
└── package-lock.json
```

## Module Organization

- **Data layer** (`db/`): owns the SQLite connection, the Drizzle schema, and the runtime `CREATE TABLE IF NOT EXISTS`. No HTTP or auth code here.
- **Security primitives** (`auth/`): pure functions for tokens and password hashing. No Express coupling beyond `middleware.ts`.
- **Routes** (`routes/`): translate HTTP <-> data/auth. Validate with `zod`, call primitives, return shaped responses.

## Naming Conventions

- Express routers are exported as `router` and mounted under `/api` in `index.ts`.
- Route files are named by resource: `auth.ts` → mounted at `/api/auth/*`.
- DB row type is `UserRow` (from `typeof users.$inferSelect`); the **public** user shape is produced by a `toUser()` mapper so storage fields never leak.

## Examples

- `server/src/routes/auth.ts` is the canonical example of the layered structure above.
- `server/src/db/index.ts` shows the connection + runtime table creation pattern.
