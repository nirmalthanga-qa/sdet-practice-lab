import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { isAdminUser, requireAdmin } from '../middleware/requireAdmin.js';

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAuth, requireAdmin);

const pagination = z.strictObject({
  page: z.string().regex(/^[1-9]\d{0,5}$/).optional(),
});
const pageSize = 20;

adminUsersRouter.get('/', async (request, response) => {
  const parsed = pagination.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_PAGE', message: 'Enter a positive page number.' } });
    return;
  }

  const page = Number(parsed.data.page ?? 1);
  try {
    const rows = await prisma.user.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
      select: {
        id: true, fullName: true, email: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    });
    response.json({
      page, hasNext: rows.length > pageSize,
      users: rows.slice(0, pageSize).map(({ _count, ...account }) => ({
        ...account, isAdmin: isAdminUser(account.id), orderCount: _count.orders,
      })),
    });
  } catch {
    response.status(503).json({ error: { code: 'USERS_UNAVAILABLE', message: 'Accounts could not be loaded.' } });
  }
});

adminUsersRouter.delete('/:userId', async (request, response) => {
  const id = request.params.userId;
  if (!z.uuid().safeParse(id).success) {
    response.status(400).json({ error: { code: 'INVALID_USER_ID', message: 'Invalid account ID.' } });
    return;
  }
  if (id === response.locals.userId || isAdminUser(id)) {
    response.status(409).json({ error: { code: 'PROTECTED_ADMIN', message: 'Administrator accounts cannot be deleted here.' } });
    return;
  }

  try {
    // PostgreSQL detaches and anonymizes orders in this same delete transaction.
    const result = await prisma.user.deleteMany({ where: { id } });
    if (!result.count) {
      response.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Account no longer exists.' } });
      return;
    }
    response.status(204).end();
  } catch {
    response.status(503).json({ error: { code: 'DELETE_UNCONFIRMED', message: 'Deletion could not be confirmed. Reload accounts before trying again.' } });
  }
});
