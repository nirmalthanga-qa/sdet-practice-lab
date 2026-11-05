import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { changeWishlist, readWishlist, WishlistError } from '../lib/wishlist.js';

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);
const versionSchema = z.strictObject({ expectedVersion: z.number().int().min(0).max(2_147_483_646) });
const reorderSchema = versionSchema.extend({
  productIds: z.array(z.string().min(1)).max(100).refine(ids => new Set(ids).size === ids.length),
});

wishlistRouter.get('/', async (_request, response) => {
  try { response.json(await readWishlist(response.locals.userId)); }
  catch { response.status(503).json({ error: { code: 'WISHLIST_UNAVAILABLE', message: 'Your wishlist is temporarily unavailable. Please reload.' } }); }
});

wishlistRouter.use((request, response, next) => {
  if (!request.is('application/json')) {
    response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send application/json.' } });
    return;
  }
  next();
});

for (const method of ['put', 'delete'] as const) {
  wishlistRouter[method]('/items/:productId', async (request, response) => {
    const parsed = versionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: { code: 'INVALID_WISHLIST', message: 'Provide a valid expectedVersion.' } }); return;
    }
    try {
      response.json(await changeWishlist(response.locals.userId, parsed.data.expectedVersion, {
        kind: method === 'put' ? 'add' : 'remove', productId: request.params.productId,
      }));
    } catch (error) {
      response.status(error instanceof WishlistError ? error.status : 503).json({ error: {
        code: error instanceof WishlistError ? error.code : 'WISHLIST_UNCONFIRMED',
        message: error instanceof WishlistError ? error.message : 'The change could not be confirmed. Reload your wishlist before trying again.',
      } });
    }
  });
}

wishlistRouter.put('/order', async (request, response) => {
  const parsed = reorderSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_WISHLIST', message: 'Provide expectedVersion and up to 100 unique product IDs.' } }); return;
  }
  try {
    response.json(await changeWishlist(response.locals.userId, parsed.data.expectedVersion, { kind: 'reorder', productIds: parsed.data.productIds }));
  } catch (error) {
    response.status(error instanceof WishlistError ? error.status : 503).json({ error: {
      code: error instanceof WishlistError ? error.code : 'WISHLIST_UNCONFIRMED',
      message: error instanceof WishlistError ? error.message : 'The order could not be confirmed. Reload your wishlist before trying again.',
    } });
  }
});
