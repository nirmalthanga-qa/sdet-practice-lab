import { Prisma } from '../generated/prisma/client.js';
import { prisma } from './prisma.js';

const include = {
  items: {
    orderBy: [{ position: 'asc' }, { productId: 'asc' }],
    select: { product: { select: {
      id: true, name: true, description: true, category: true,
      pricePaise: true, stock: true, icon: true,
    } } },
  },
} satisfies Prisma.WishlistInclude;

export class WishlistError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message); this.status = status; this.code = code;
  }
}

export async function readWishlist(userId: string, db: Prisma.TransactionClient = prisma) {
  const list = await db.wishlist.findUnique({ where: { userId }, include });
  return { version: list?.version ?? 0, items: list?.items.map(item => item.product) ?? [] };
}

type Change = { kind: 'add'; productId: string } | { kind: 'remove'; productId: string }
  | { kind: 'reorder'; productIds: string[] };

export async function changeWishlist(userId: string, expectedVersion: number, change: Change) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async db => {
        await db.wishlist.upsert({ where: { userId }, create: { userId }, update: {} });
        const current = await readWishlist(userId, db);
        if (current.version !== expectedVersion) {
          throw new WishlistError(409, 'WISHLIST_CHANGED', 'Your wishlist changed. Reload it before trying again.');
        }
        let ids = current.items.map(item => item.id);
        if (change.kind === 'add') {
          const product = await db.product.findUnique({ where: { id: change.productId }, select: { id: true } });
          if (!product) throw new WishlistError(404, 'PRODUCT_NOT_FOUND', 'This product is no longer available.');
          if (!ids.includes(change.productId)) {
            if (ids.length >= 100) throw new WishlistError(409, 'WISHLIST_FULL', 'Save up to 100 products. Remove one before adding another.');
            ids = [...ids, change.productId];
          }
        } else if (change.kind === 'remove') {
          ids = ids.filter(id => id !== change.productId);
        } else {
          if (ids.length !== change.productIds.length || !change.productIds.every(id => ids.includes(id))) {
            throw new WishlistError(409, 'WISHLIST_CHANGED', 'Products in your wishlist changed. Reload before reordering.');
          }
          ids = change.productIds;
        }
        // Every writer touches the parent row. Serializable retries prevent lost updates.
        await db.wishlist.update({ where: { userId }, data: { version: { increment: 1 } } });
        await db.wishlistItem.deleteMany({ where: { userId } });
        if (ids.length) await db.wishlistItem.createMany({ data: ids.map((productId, position) => ({ userId, productId, position })) });
        return readWishlist(userId, db);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) {
        if (attempt < 2) continue;
        throw new WishlistError(409, 'WISHLIST_CHANGED', 'Your wishlist changed. Reload it before trying again.');
      }
      throw error;
    }
  }
  throw new Error('Wishlist retry limit reached');
}
