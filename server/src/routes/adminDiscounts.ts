import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { createDiscountSchema, discountCodeSchema, discountStatusSchema } from '../validation/discount.js';

export const adminDiscountsRouter = Router();
adminDiscountsRouter.use(requireAuth, requireAdmin);

adminDiscountsRouter.get('/', async (_request, response) => {
  try {
    const discounts = await prisma.discount.findMany({ orderBy: [{ createdAt: 'desc' }, { code: 'asc' }] });
    response.json({ discounts });
  } catch {
    response.status(503).json({ error: { code: 'DISCOUNTS_UNAVAILABLE', message: 'Discounts are temporarily unavailable.' } });
  }
});

adminDiscountsRouter.post('/', async (request, response) => {
  if (!request.is('application/json')) {
    response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send application/json.' } }); return;
  }
  const result = createDiscountSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: { code: 'INVALID_DISCOUNT', message: 'Check the discount details.', fields: z.flattenError(result.error).fieldErrors } }); return;
  }
  try {
    const input = result.data;
    const discount = await prisma.discount.create({ data: {
      code: input.code, type: input.type,
      percent: input.type === 'PERCENTAGE' ? input.percent : null,
      amountPaise: input.type === 'FIXED' ? input.amountPaise : null,
      minimumSubtotalPaise: input.minimumSubtotalPaise,
      expiresAt: new Date(input.expiresAt), isActive: input.isActive,
    } });
    response.status(201).json({ discount });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      response.status(409).json({ error: { code: 'DISCOUNT_CODE_EXISTS', message: 'That discount code already exists. Check the discount list.' } }); return;
    }
    response.status(503).json({ error: { code: 'DISCOUNT_CREATE_UNCONFIRMED', message: 'Creation could not be confirmed. Reload the discount list before retrying with the same code.' } });
  }
});

adminDiscountsRouter.patch('/:code/status', async (request, response) => {
  if (!request.is('application/json')) {
    response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send application/json.' } }); return;
  }
  const code = discountCodeSchema.safeParse(request.params.code);
  const body = discountStatusSchema.safeParse(request.body);
  if (!code.success || !body.success) {
    response.status(400).json({ error: { code: 'INVALID_DISCOUNT_STATUS', message: 'Provide a valid code and a boolean isActive value.' } }); return;
  }
  try {
    // Test expiry in the same write that enables the discount.
    const discount = await prisma.discount.update({
      where: { code: code.data, ...(body.data.isActive ? { expiresAt: { gt: new Date() } } : {}) },
      data: { isActive: body.data.isActive },
    });
    response.json({ discount });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      try {
        const exists = await prisma.discount.findUnique({ where: { code: code.data }, select: { code: true } });
        response.status(exists ? 409 : 404).json({ error: {
          code: exists ? 'DISCOUNT_EXPIRED' : 'DISCOUNT_NOT_FOUND',
          message: exists ? 'An expired discount cannot be activated.' : 'That discount code does not exist.',
        } });
        return;
      } catch { /* Report an unconfirmed outcome below if lookup fails. */ }
    }
    response.status(503).json({ error: { code: 'DISCOUNT_UPDATE_UNCONFIRMED', message: 'The status update could not be confirmed. Reload the discount list before retrying.' } });
  }
});


adminDiscountsRouter.delete('/:code', async (request, response) => {
  const parsed = discountCodeSchema.safeParse(request.params.code);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_DISCOUNT_CODE', message: 'Provide a valid discount code.' } }); return;
  }
  try {
    const result = await prisma.discount.deleteMany({ where: { code: parsed.data } });
    if (result.count === 0) {
      response.status(404).json({ error: { code: 'DISCOUNT_NOT_FOUND', message: 'That discount code no longer exists.' } }); return;
    }
    response.status(204).end();
  } catch {
    response.status(503).json({ error: { code: 'DISCOUNT_DELETE_UNCONFIRMED', message: 'Deletion could not be confirmed. Reload discounts before trying again.' } });
  }
});
