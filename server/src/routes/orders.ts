import { createHash } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import type { AuthLocals } from '../middleware/requireAuth.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.use((_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});

const MAX_DATABASE_INTEGER = 2_147_483_647;

const checkoutItemSchema = z
  .object({
    productId: z.string().min(1).max(200),

    quantity: z
      .number()
      .int()
      .min(1)
      .max(MAX_DATABASE_INTEGER),

    unitPricePaise: z
      .number()
      .int()
      .min(0)
      .max(MAX_DATABASE_INTEGER),
  })
  .strict();

const checkoutSchema = z
  .object({
    checkoutId: z.uuid(),

    paymentMethod: z.literal('simulated'),

    delivery: z
      .object({
        fullName: z.string().trim().min(1).max(100),

        email: z
          .string()
          .trim()
          .toLowerCase()
          .max(254)
          .pipe(z.email()),

        address: z.string().trim().min(1).max(300),

        city: z.string().trim().min(1).max(100),

        postalCode: z
          .string()
          .trim()
          .regex(/^[1-9][0-9]{5}$/),
      })
      .strict(),

    items: z
      .array(checkoutItemSchema)
      .min(1)
      .max(100)
      .refine(
        (items) =>
          new Set(items.map((item) => item.productId)).size ===
          items.length,
        {
          message: 'Each product must appear only once.',
        },
      ),
  })
  .strict();

type CheckoutInput = z.infer<typeof checkoutSchema>;

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: true;
  };
}>;

class CheckoutError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);

    this.name = 'CheckoutError';
    this.status = status;
    this.code = code;
  }
}

function toPublicOrder(order: OrderWithItems) {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotalPaise: order.subtotalPaise,
    totalPaise: order.totalPaise,
    createdAt: order.createdAt,

    delivery: {
      fullName: order.fullName,
      email: order.email,
      address: order.address,
      city: order.city,
      postalCode: order.postalCode,
    },

    items: [...order.items]
      .sort((first, second) =>
        first.productId < second.productId
          ? -1
          : first.productId > second.productId
            ? 1
            : 0,
      )
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPricePaise: item.unitPricePaise,
        quantity: item.quantity,
        lineTotalPaise: item.lineTotalPaise,
      })),
  };
}

async function createOrder(
  userId: string,
  input: CheckoutInput,
): Promise<{
  order: OrderWithItems;
  replayed: boolean;
}> {
  const expectedItems = [...input.items].sort((first, second) =>
    first.productId < second.productId
      ? -1
      : first.productId > second.productId
        ? 1
        : 0,
  );

  const requestHash = createHash('sha256')
    .update(
      JSON.stringify({
        delivery: input.delivery,
        paymentMethod: input.paymentMethod,
        items: expectedItems,
      }),
    )
    .digest('hex');

  const expectedItemsById = new Map(
    expectedItems.map((item) => [item.productId, item]),
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          // Check retries before reading the cart: a successful
          // checkout has already removed its purchased cart items.
          const existingOrder = await transaction.order.findUnique({
            where: {
              userId_checkoutId: {
                userId,
                checkoutId: input.checkoutId,
              },
            },
            include: {
              items: true,
            },
          });

          if (existingOrder) {
            if (existingOrder.requestHash !== requestHash) {
              throw new CheckoutError(
                409,
                'CHECKOUT_ID_REUSED',
                'This checkout ID was already used with different details.',
              );
            }

            return {
              order: existingOrder,
              replayed: true,
            };
          }

          const cartItems = await transaction.cartItem.findMany({
            where: {
              userId,
            },
            include: {
              product: true,
            },
            orderBy: {
              productId: 'asc',
            },
          });

          if (cartItems.length === 0) {
            throw new CheckoutError(
              409,
              'CART_EMPTY',
              'Your cart is empty. Add a product before placing an order.',
            );
          }

          if (cartItems.length !== expectedItems.length) {
            throw new CheckoutError(
              409,
              'CART_CHANGED',
              'Your cart has changed. Review it before placing your order.',
            );
          }

          const orderItems = cartItems.map((cartItem) => {
            const expectedItem = expectedItemsById.get(
              cartItem.productId,
            );

            if (
              !expectedItem ||
              expectedItem.quantity !== cartItem.quantity
            ) {
              throw new CheckoutError(
                409,
                'CART_CHANGED',
                'Your cart has changed. Review it before placing your order.',
              );
            }

            const product = cartItem.product;

            if (expectedItem.unitPricePaise !== product.pricePaise) {
              throw new CheckoutError(
                409,
                'PRICE_CHANGED',
                'A product price has changed. Review your cart before continuing.',
              );
            }

            if (
              cartItem.quantity < 1 ||
              product.pricePaise < 0 ||
              cartItem.quantity > product.stock
            ) {
              throw new CheckoutError(
                409,
                'ITEM_UNAVAILABLE',
                `${product.name} is no longer available in the requested quantity.`,
              );
            }

            const lineTotalPaise =
              product.pricePaise * cartItem.quantity;

            if (
              !Number.isSafeInteger(lineTotalPaise) ||
              lineTotalPaise > MAX_DATABASE_INTEGER
            ) {
              throw new CheckoutError(
                400,
                'ORDER_LIMIT_EXCEEDED',
                'The order value exceeds the supported limit.',
              );
            }

            return {
              productId: product.id,
              productName: product.name,
              unitPricePaise: product.pricePaise,
              quantity: cartItem.quantity,
              lineTotalPaise,
            };
          });

          const subtotalPaise = orderItems.reduce(
            (total, item) => total + item.lineTotalPaise,
            0,
          );

          if (
            !Number.isSafeInteger(subtotalPaise) ||
            subtotalPaise > MAX_DATABASE_INTEGER
          ) {
            throw new CheckoutError(
              400,
              'ORDER_LIMIT_EXCEEDED',
              'The order value exceeds the supported limit.',
            );
          }

          // Stock updates and order creation belong to the same
          // transaction. Any failure rolls everything back.
          for (const item of orderItems) {
            const stockUpdate = await transaction.product.updateMany({
              where: {
                id: item.productId,
                stock: {
                  gte: item.quantity,
                },
              },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });

            if (stockUpdate.count !== 1) {
              throw new CheckoutError(
                409,
                'INSUFFICIENT_STOCK',
                'A product no longer has enough stock. Review your cart.',
              );
            }
          }

          const order = await transaction.order.create({
            data: {
              userId,
              checkoutId: input.checkoutId,
              requestHash,
              status: 'CONFIRMED',
              paymentStatus: 'SIMULATED_PAID',
              currency: 'INR',
              subtotalPaise,
              totalPaise: subtotalPaise,
              ...input.delivery,

              items: {
                create: orderItems,
              },
            },
            include: {
              items: true,
            },
          });

          await transaction.cartItem.deleteMany({
            where: {
              userId,
              id: {
                in: cartItems.map((item) => item.id),
              },
            },
          });

          return {
            order,
            replayed: false,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5_000,
          timeout: 10_000,
        },
      );
    } catch (error) {
      const isRetryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002');

      if (isRetryable && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('Order transaction could not be completed.');
}

// Place an order using the authenticated customer's cart.
ordersRouter.post(
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

    const result = checkoutSchema.safeParse(request.body);

    if (!result.success) {
      response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please correct your checkout details.',
          fields: z.flattenError(result.error).fieldErrors,
        },
      });

      return;
    }

    try {
      const resultOrder = await createOrder(
        response.locals.userId,
        result.data,
      );

      response
        .status(resultOrder.replayed ? 200 : 201)
        .json({
          order: toPublicOrder(resultOrder.order),
        });
    } catch (error) {
      if (error instanceof CheckoutError) {
        response.status(error.status).json({
          error: {
            code: error.code,
            message: error.message,
          },
        });

        return;
      }

      console.error('Checkout failed.');

      response.status(503).json({
        error: {
          code: 'CHECKOUT_UNAVAILABLE',
          message:
            'We couldn’t confirm your order. Retry with the same checkout ID and details.',
        },
      });
    }
  },
);

// Retrieve the signed-in customer's latest 50 orders.
ordersRouter.get(
  '/',
  async (
    _request: Request,
    response: Response<unknown, AuthLocals>,
  ) => {
    try {
      const orders = await prisma.order.findMany({
        where: {
          userId: response.locals.userId,
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        take: 50,
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          currency: true,
          totalPaise: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
            },
          },
        },
      });

      response.status(200).json({
        orders: orders.map((order) => ({
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          currency: order.currency,
          totalPaise: order.totalPaise,
          createdAt: order.createdAt,
          itemCount: order.items.reduce(
            (total, item) => total + item.quantity,
            0,
          ),
        })),
      });
    } catch {
      console.error('Order history lookup failed.');

      response.status(503).json({
        error: {
          code: 'ORDER_HISTORY_UNAVAILABLE',
          message: 'We couldn’t load your orders. Please try again.',
        },
      });
    }
  },
);

// Retrieve an order only when it belongs to the signed-in customer.
ordersRouter.get(
  '/:orderId',
  async (
    request: Request<{ orderId: string }>,
    response: Response<unknown, AuthLocals>,
  ) => {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: request.params.orderId,
          userId: response.locals.userId,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        response.status(404).json({
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'We couldn’t find that order.',
          },
        });

        return;
      }

      response.status(200).json({
        order: toPublicOrder(order),
      });
    } catch {
      console.error('Order lookup failed.');

      response.status(503).json({
        error: {
          code: 'ORDER_UNAVAILABLE',
          message: 'We couldn’t load your order. Please try again.',
        },
      });
    }
  },
);