import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import type { AuthLocals } from '../middleware/requireAuth.js';
import { cartTransferRouter } from './cartTransfer.js';

export const cartRouter = Router();

cartRouter.use(requireAuth);
cartRouter.use('/transfer', cartTransferRouter);

const quantitySchema = z.object({
  quantity: z.number().int().min(1).max(2147483647),
});

// Read the signed-in customer's cart.
cartRouter.get(
  '/',
  async (_request: Request, response: Response<unknown, AuthLocals>) => {
    try {
      const items = await prisma.cartItem.findMany({
        where: {
          userId: response.locals.userId,
        },
        select: {
          productId: true,
          quantity: true,
        },
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
      });

      response.status(200).json({ items });
    } catch {
      console.error('Cart lookup failed.');

      response.status(503).json({
        error: {
          code: 'CART_UNAVAILABLE',
          message: 'We couldn’t load your cart. Please try again.',
        },
      });
    }
  },
);

// Add a product or replace its existing quantity.
cartRouter.put(
  '/items/:productId',
  async (
    request: Request<{ productId: string }>,
    response: Response<unknown, AuthLocals>,
  ) => {
    if (!request.is('application/json')) {
      response.status(415).json({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Send the request body as application/json.',
        },
      });

      return;
    }

    const result = quantitySchema.safeParse(request.body);

    if (!result.success) {
      response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quantity must be a positive whole number.',
        },
      });

      return;
    }

    const { quantity } = result.data;
    const { productId } = request.params;
    const userId = response.locals.userId;

    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          stock: true,
        },
      });

      if (!product) {
        response.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'This product is no longer available.',
          },
        });

        return;
      }

      if (quantity > product.stock) {
        response.status(409).json({
          error: {
            code: 'INSUFFICIENT_STOCK',
            message:
              product.stock === 0
                ? 'This product is out of stock.'
                : `Only ${product.stock} units are available.`,
            availableStock: product.stock,
          },
        });

        return;
      }

      const item = await prisma.cartItem.upsert({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        create: {
          userId,
          productId,
          quantity,
        },
        update: {
          quantity,
        },
        select: {
          productId: true,
          quantity: true,
        },
      });

      response.status(200).json({ item });
    } catch {
      console.error('Cart update failed.');

      response.status(503).json({
        error: {
          code: 'CART_UPDATE_FAILED',
          message: 'We couldn’t update your cart. Please try again.',
        },
      });
    }
  },
);

cartRouter.delete(
  '/items/:productId',
  async (
    request: Request<{ productId: string }>,
    response: Response<unknown, AuthLocals>,
  ) => {
    try {
      await prisma.cartItem.deleteMany({
        where: {
          userId: response.locals.userId,
          productId: request.params.productId,
        },
      });

      response.status(204).end();
    } catch {
      console.error('Cart item removal failed.');

      response.status(503).json({
        error: {
          code: 'CART_REMOVE_FAILED',
          message: 'We couldn’t remove this item. Please try again.',
        },
      });
    }
  },
);

cartRouter.delete(
  '/',
  async (_request: Request, response: Response<unknown, AuthLocals>) => {
    try {
      await prisma.cartItem.deleteMany({
        where: {
          userId: response.locals.userId,
        },
      });

      response.status(204).end();
    } catch {
      console.error('Cart clear failed.');

      response.status(503).json({
        error: {
          code: 'CART_CLEAR_FAILED',
          message: 'We couldn’t clear your cart. Please try again.',
        },
      });
    }
  },
);