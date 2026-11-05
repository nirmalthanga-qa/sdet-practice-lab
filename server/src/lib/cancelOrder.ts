import { Prisma } from '../generated/prisma/client.js';
import { prisma } from './prisma.js';
export class CancellationError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message); this.name = 'CancellationError'; this.status = status; this.code = code;
  }
}
class RetryCancellation extends Error {}
export async function cancelCustomerOrder(userId: string, orderId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const order = await transaction.order.findFirst({ where: { id: orderId, userId }, include: { items: true } });
        // Do not reveal another customer's order existence.
        if (!order) throw new CancellationError(404, 'ORDER_NOT_FOUND', 'We couldn’t find that order.');
        if (order.status === 'CANCELLED') return order;
        if (order.status !== 'CONFIRMED') throw new CancellationError(409, 'ORDER_NOT_CANCELLABLE', 'This order cannot be cancelled.');
        const cancelledAt = new Date();
        const claimed = await transaction.order.updateMany({
          where: { id: orderId, userId, status: 'CONFIRMED' },
          data: { status: 'CANCELLED', cancelledAt },
        });
        if (claimed.count !== 1) throw new RetryCancellation();
        for (const item of [...order.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
          const result = await transaction.product.updateMany({
            where: { id: item.productId, stock: { lte: 2_147_483_647 - item.quantity } },
            data: { stock: { increment: item.quantity } },
          });
          if (result.count === 0) {
            const existing = await transaction.product.findUnique({ where: { id: item.productId }, select: { id: true } });
            if (existing) throw new CancellationError(409, 'RESTOCK_LIMIT_EXCEEDED', 'Cancellation would exceed the stock limit. Ask an administrator to review inventory, then retry.');
            // Deleted products stay deleted. The receipt retains their snapshots.
          }
        }
        return { ...order, status: 'CANCELLED' as const, cancelledAt };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
    } catch (error) {
      if (attempt < 2 && (error instanceof RetryCancellation ||
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'))) continue;
      throw error;
    }
  }
  throw new Error('Cancellation could not be confirmed.');
}
