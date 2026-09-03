import '../src/env';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { hashPassword } from '../src/auth/passwords';

const EMAIL = 'admin@demo.com';
const PASSWORD = 'secret123';

async function main() {
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    console.error('FATAL: JWT secrets not set. Copy .env.example to .env first.');
    process.exit(1);
  }

  const existing = db.select().from(users).where(eq(users.email, EMAIL)).get();
  if (existing) {
    console.log(`Seed user ${EMAIL} already exists, skipping.`);
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);
  db.insert(users)
    .values({
      id: randomUUID(),
      email: EMAIL,
      username: 'admin',
      passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    })
    .run();

  console.log(`Seeded admin user: ${EMAIL} / ${PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
