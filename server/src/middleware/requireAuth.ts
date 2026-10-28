import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  hashSessionToken,
  readSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '../lib/session.js';

export type AuthLocals = {
  userId: string;
};

export async function requireAuth(
  request: Request,
  response: Response<unknown, AuthLocals>,
  next: NextFunction,
) {
  response.set('Cache-Control', 'no-store');

  const token = readSessionToken(request);

  if (!token) {
    response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);

    response.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Please sign in to continue.',
      },
    });

    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: {
        tokenHash: hashSessionToken(token),
      },
      select: {
        userId: true,
        expiresAt: true,
      },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      response.clearCookie(
        SESSION_COOKIE_NAME,
        sessionCookieOptions,
      );

      response.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Please sign in to continue.',
        },
      });

      return;
    }

    response.locals.userId = session.userId;
  } catch {
    console.error('Authentication check failed.');

    response.status(503).json({
      error: {
        code: 'SESSION_UNAVAILABLE',
        message: 'We couldn’t check your session. Please try again.',
      },
    });

    return;
  }

  next();
}