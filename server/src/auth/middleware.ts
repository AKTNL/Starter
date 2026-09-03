import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './jwt';

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = await verifyAccessToken(token);
    (req as AuthRequest).user = {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
      exp: payload.exp,
    };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
