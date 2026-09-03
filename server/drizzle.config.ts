import { defineConfig } from 'drizzle-kit';

// Note: the `users` table is created at runtime via `CREATE TABLE IF NOT EXISTS`
// in `src/db/index.ts`, so no migration step is required to boot the server.
// This config is provided for `drizzle-kit generate`/`migrate` if you later want
// versioned migrations.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './data/app.db',
  },
});
