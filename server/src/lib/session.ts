import { createHash, randomBytes } from 'node:crypto';
import process from 'node:process';
import type { CookieOptions, Request } from 'express';
import { prisma } from './prisma.js';

export const SESSION_COOKIE_NAME = 'sdet_session';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const secureCookieSetting = process.env.SESSION_COOKIE_SECURE;

if (
  secureCookieSetting !== undefined &&
  secureCookieSetting !== 'true' &&
  secureCookieSetting !== 'false'
) {
  throw new Error('SESSION_COOKIE_SECURE must be true or false.');
}

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure:
    secureCookieSetting === undefined
      ? process.env.NODE_ENV === 'production'
      : secureCookieSetting === 'true',
  sameSite: 'lax',
  path: '/',
};

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function readSessionToken(request: Request): string | null {
  const cookies: unknown = request.cookies;

  if (
    typeof cookies !== 'object' ||
    cookies === null ||
    !(SESSION_COOKIE_NAME in cookies)
  ) {
    return null;
  }

  const token = cookies[SESSION_COOKIE_NAME];

  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return null;
  }

  return token;
}