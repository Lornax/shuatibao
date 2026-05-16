import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import { config } from '../config.js';

const BCRYPT_ROUNDS = 10;
const JWT_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 天

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export type JwtPayload = {
  sub: string; // user id
  email: string;
  exp: number;
};

export async function signUserJwt(userId: string, email: string): Promise<string> {
  const payload: JwtPayload = {
    sub: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + JWT_TTL_SECONDS,
  };
  return sign(payload as unknown as Record<string, unknown>, config.JWT_SECRET);
}

export async function verifyUserJwt(token: string): Promise<JwtPayload | null> {
  try {
    const decoded = (await verify(token, config.JWT_SECRET, 'HS256')) as unknown as JwtPayload;
    if (!decoded.sub) return null;
    return decoded;
  } catch {
    return null;
  }
}
