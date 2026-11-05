import { z } from 'zod';
import { categoryName } from './category.js';

export const newProductSchema = z.strictObject({
  id: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(2000),
  category: categoryName,
  pricePaise: z.number().int().min(0).max(2_147_483_647),
  stock: z.number().int().min(0).max(2_147_483_647),
  icon: z.string().trim().min(1).max(32),
  displayOrder: z.number().int().min(0).max(2_147_483_647),
});
