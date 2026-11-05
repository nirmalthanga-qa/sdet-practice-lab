import process from 'node:process';
import type { Request, Response, NextFunction } from 'express';
import type { AuthLocals } from './requireAuth.js';

const adminUserIds = new Set((process.env.ADMIN_USER_IDS ?? '')
  .split(',').map((id) => id.trim()).filter(Boolean));

export function isAdminUser(userId: string): boolean {
  return adminUserIds.has(userId);
}

// Mount after requireAuth so the user ID comes from the verified session.
export function requireAdmin(_request: Request, response: Response<unknown, AuthLocals>, next: NextFunction) {
  if (!isAdminUser(response.locals.userId)) {
    response.status(403).json({ error: {
      code: 'ADMIN_REQUIRED', message: 'Administrator access is required.',
    } });
    return;
  }
  next();
}
