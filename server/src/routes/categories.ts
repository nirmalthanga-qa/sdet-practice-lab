import { Router } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { createCategorySchema } from '../validation/category.js';

export const categoriesRouter = Router();
export const adminCategoriesRouter = Router();

categoriesRouter.get('/', async (_request, response) => {
  response.set('Cache-Control', 'no-store');
  try {
    const categories = await prisma.category.findMany({ select: { name: true }, orderBy: { name: 'asc' } });
    response.json({ categories });
  } catch {
    response.status(503).json({ error: { code: 'CATEGORIES_UNAVAILABLE', message: 'Categories are temporarily unavailable.' } });
  }
});

adminCategoriesRouter.use(requireAuth, requireAdmin);
adminCategoriesRouter.post('/', async (request, response) => {
  if (!request.is('application/json')) {
    response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send application/json.' } }); return;
  }
  const parsed = createCategorySchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_CATEGORY', message: 'Enter a category name of 1–60 characters using letters, numbers, spaces, &, parentheses, apostrophes or hyphens.' } }); return;
  }
  try {
    const category = await prisma.category.create({
      data: { name: parsed.data.name, normalizedName: parsed.data.name.toLowerCase() }, select: { name: true },
    });
    response.status(201).json({ category });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      response.status(409).json({ error: { code: 'CATEGORY_EXISTS', message: 'That category already exists. Reload categories and select it.' } }); return;
    }
    response.status(503).json({ error: { code: 'CATEGORY_CREATE_UNCONFIRMED', message: 'Creation could not be confirmed. Reload categories before retrying.' } });
  }
});
