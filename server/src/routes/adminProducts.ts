import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { newProductSchema } from '../validation/newProduct.js';

export const adminProductsRouter = Router();
adminProductsRouter.use(requireAuth, requireAdmin);
adminProductsRouter.post('/', async (request, response) => {
  if (!request.is('application/json')) {
    response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send application/json.' } });
    return;
  }
  const parsed = newProductSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: {
      code: 'INVALID_PRODUCT', message: 'Check the product details.',
      fields: z.flattenError(parsed.error).fieldErrors,
    } });
    return;
  }
  try {
    const category = await prisma.category.findUnique({
      where: { normalizedName: parsed.data.category.toLowerCase() }, select: { name: true },
    });
    if (!category) {
      response.status(400).json({ error: { code: 'CATEGORY_NOT_FOUND', message: 'Create or select an existing category first.' } });
      return;
    }
    const product = await prisma.product.create({ data: { ...parsed.data, category: category.name } });
    response.location(`/api/products/${encodeURIComponent(product.id)}`).status(201).json({ product });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      response.status(409).json({ error: { code: 'PRODUCT_ID_EXISTS', message: 'This product ID already exists. Check inventory before choosing another ID.' } });
      return;
    }
    response.status(503).json({ error: {
      code: 'PRODUCT_CREATE_UNCONFIRMED',
      message: 'Creation could not be confirmed. Check inventory for this ID before retrying. Keep the same ID to avoid creating a duplicate product.',
    } });
  }
});


adminProductsRouter.delete('/:productId', async (request, response) => {
  const productId = request.params.productId;
  if (!productId.trim() || productId.length > 200) {
    response.status(400).json({ error: { code: 'INVALID_PRODUCT_ID', message: 'Provide a valid product ID.' } });
    return;
  }
  try {
    // The database cascades deletion to CartItem. OrderItem contains independent snapshots.
    const result = await prisma.product.deleteMany({ where: { id: productId } });
    if (result.count === 0) {
      response.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'This product no longer exists.' } });
      return;
    }
    response.status(204).end();
  } catch {
    response.status(503).json({ error: {
      code: 'PRODUCT_DELETE_UNCONFIRMED',
      message: 'Deletion could not be confirmed. Reload inventory before trying again.',
    } });
  }
});
