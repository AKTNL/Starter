import { SignJWT, jwtVerify } from 'jose';

function encodeSecret(secret?: string): Uint8Array {
  if (!secret) {
    throw new Error('JWT secret environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  sub: string,
  email: string,
  role: string,
): Promise<string> {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(encodeSecret(process.env.JWT_ACCESS_SECRET));
}

export async function signRefreshToken(sub: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodeSecret(process.env.JWT_REFRESH_SECRET));
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, encodeSecret(process.env.JWT_ACCESS_SECRET));
  return payload;
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, encodeSecret(process.env.JWT_REFRESH_SECRET));
  return payload;
}
