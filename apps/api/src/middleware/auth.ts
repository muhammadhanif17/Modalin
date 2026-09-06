import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env, REFRESH_SECRET, isHttps } from '../config/env.js';
import { forbidden, unauthorized } from '../lib/http.js';

/**
 * Modul 1 (Autentikasi & Verifikasi) memegang middleware otorisasi JWT terpusat
 * untuk seluruh modul lain — ARCHITECTURE.md §4.1.
 */

export type TokenUser = { id: string; role: Role };
export type AuthRequest = Request & { user?: TokenUser };

export const REFRESH_COOKIE = 'modalin_refresh';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_PATH = '/api/auth';

export function issueAccessToken(user: TokenUser): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '15m',
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: 'HS256',
  });
}

export function issueRefreshToken(userId: string): string {
  return jwt.sign({}, REFRESH_SECRET, {
    subject: userId,
    expiresIn: '30d',
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: 'HS256',
  });
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: COOKIE_PATH,
    maxAge: REFRESH_TTL_MS,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: COOKIE_PATH,
  });
}

export function verifyRefreshToken(token: string): string {
  const payload = jwt.verify(token, REFRESH_SECRET, {
    algorithms: ['HS256'],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  if (typeof payload === 'string' || !payload.sub) throw unauthorized('Token pembaruan tidak sah.');
  return payload.sub;
}

/** Verifikasi access token dari header Authorization. */
function readBearer(req: Request): TokenUser {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthorized('Kamu perlu masuk dulu.');
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    if (typeof payload === 'string' || !payload.sub || !payload.role) throw new Error('invalid');
    return { id: payload.sub, role: payload.role as Role };
  } catch {
    throw unauthorized();
  }
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    req.user = readBearer(req);
    next();
  } catch (error) {
    next(error);
  }
}

/** Auth opsional: isi req.user kalau ada token valid, tapi jangan tolak kalau tidak ada. */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    req.user = readBearer(req);
  } catch {
    req.user = undefined;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/** Ambil user dari request yang sudah lewat requireAuth. */
export function currentUser(req: AuthRequest): TokenUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
