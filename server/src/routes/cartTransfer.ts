import { createHash } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type { AuthLocals } from '../middleware/requireAuth.js';

export const cartTransferRouter = Router();

const transferSchema = z.object({
  transferId: z.uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(200),
        quantity: z.number().int().min(1).max(2147483647),
      }).strict(),
    )
    .min(1)
    .max(100)
    .refine(
      (items) =>
        new Set(items.map((item) => item.productId)).size ===
        items.length,
      'Each product must appear only once.',
    ),
}).strict();

type TransferInput = z.infer<typeof transferSchema>;

class TransferError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'TransferError';
    this.status = status;
    this.code = code;
  }
}

async function transferCart(
  userId: string,
  input: TransferInput,
) {
  // Sort before hashing so changing the array order doesn't
  // turn the same items into a different request.
  const items = [...input.items].sort((a, b) =>
    a.productId < b.productId
      ? -1
      : a.productId > b.productId
        ? 1
        : 0,
  );

  const payloadHash = createHash('sha256')
    .update(JSON.stringify(items))
    .digest('hex');

  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const previousTransfer =
            await transaction.cartTransfer.findUnique({
              where: {
                userId_transferId: {
                  userId,
                  transferId: input.transferId,
                },
              },
            });

          if (previousTransfer) {
            if (previousTransfer.payloadHash !== payloadHash) {
              throw new TransferError(
                409,
                'TRANSFER_ID_REUSED',
                'This transfer ID was already used with different items.',
              );
            }

            return previousTransfer.result;
          }

          for (const item of items) {
            const product = await transaction.product.findUnique({
              where: { id: item.productId },
              select: {
                id: true,
                name: true,
                stock: true,
              },
            });

            if (!product) {
              throw new TransferError(
                409,
                'PRODUCT_UNAVAILABLE',
                `Product ${item.productId} is no longer available.`,
              );
            }

            const existingItem =
              await transaction.cartItem.findUnique({
                where: {
                  userId_productId: {
                    userId,
                    productId: item.productId,
                  },
                },
                select: { quantity: true },
              });

            const combinedQuantity =
              (existingItem?.quantity ?? 0) + item.quantity;

            if (combinedQuantity > product.stock) {
              throw new TransferError(
                409,
                'INSUFFICIENT_STOCK',
                `${product.name}: only ${product.stock} available, but the combined quantity is ${combinedQuantity}.`,
              );
            }

            await transaction.cartItem.upsert({
              where: {
                userId_productId: {
                  userId,
                  productId: item.productId,
                },
              },
              create: {
                userId,
                productId: item.productId,
                quantity: combinedQuantity,
              },
              update: {
                quantity: combinedQuantity,
              },
            });
          }

          const result = {
            transferId: input.transferId,
            transferredProductCount: items.length,
          };

          await transaction.cartTransfer.create({
            data: {
              userId,
              transferId: input.transferId,
              payloadHash,
              result,
            },
          });

          return result;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        },
      );
    } catch (error) {
      const canRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002');

      if (canRetry && attempt < maxAttempts - 1) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('Cart transfer could not complete.');
}

cartTransferRouter.post(
  '/',
  async (
    request: Request,
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

    const parsed = transferSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'Provide a valid transfer ID and 1–100 unique products with positive whole-number quantities.',
        },
      });

      return;
    }

    try {
      const result = await transferCart(
        response.locals.userId,
        parsed.data,
      );

      response.status(200).json(result);
    } catch (error) {
      if (error instanceof TransferError) {
        response.status(error.status).json({
          error: {
            code: error.code,
            message: error.message,
          },
        });

        return;
      }

      console.error('Guest-cart transfer failed.');

      response.status(503).json({
        error: {
          code: 'TRANSFER_FAILED',
          message:
            'We couldn’t confirm the transfer. Retry with the same transfer ID and items.',
        },
      });
    }
  },
);