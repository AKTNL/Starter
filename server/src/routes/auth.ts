import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { users, type UserRow } from '../db/schema';
import { hashPassword, verifyPassword } from '../auth/passwords';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt';
import { requireAuth, type AuthRequest } from '../auth/middleware';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  // NOTE: camelCase on purpose — the frontend sends `{ refreshToken }`, not `refresh_token`.
  refreshToken: z.string().min(1),
});

function toUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role as 'admin' | 'user',
  };
}

function signTokens(row: UserRow) {
  return Promise.all([
    signAccessToken(row.id, row.email, row.role),
    signRefreshToken(row.id),
  ]);
}

router.post('/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid registration data' });
    return;
  }
  const { email, password, name } = parsed.data;

  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const row: UserRow = {
    id: randomUUID(),
    email,
    username: name, // map register `name` -> stored `username`
    passwordHash,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
  db.insert(users).values(row).run();

  const [access_token, refresh_token] = await signTokens(row);
  res.json({ access_token, refresh_token, user: toUser(row) });
});

router.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid login data' });
    return;
  }
  const { email, password } = parsed.data;

  const row = db.select().from(users).where(eq(users.email, email)).get();
  if (!row) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }
  const ok = await verifyPassword(row.passwordHash, password);
  if (!ok) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  const [access_token, refresh_token] = await signTokens(row);
  res.json({ access_token, refresh_token, user: toUser(row) });
});

router.get('/auth/me', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.sub;
  const row = db.select().from(users).where(eq(users.id, userId)).get();
  if (!row) {
    res.status(401).json({ message: 'User not found' });
    return;
  }
  res.json(toUser(row));
});

router.post('/auth/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'refreshToken is required' });
    return;
  }
  try {
    const payload = await verifyRefreshToken(parsed.data.refreshToken);
    const userId = payload.sub as string;
    const row = db.select().from(users).where(eq(users.id, userId)).get();
    if (!row) {
      res.status(401).json({ message: 'Invalid refresh token' });
      return;
    }
    const [access_token, refresh_token] = await signTokens(row);
    res.json({ access_token, refresh_token });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

export { router };
