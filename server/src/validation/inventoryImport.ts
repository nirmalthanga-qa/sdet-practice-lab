import { z } from 'zod';
const quantity = z.number().int().min(0).max(2_147_483_647);
export const inventoryImportSchema = z.strictObject({
  items: z.array(z.strictObject({
    productId: z.string().trim().min(1).max(200),
    expectedStock: quantity,
    stock: quantity,
  })).min(1).max(100),
}).refine(({ items }) => new Set(items.map((item) => item.productId)).size === items.length,
  { message: 'Product IDs must be unique.', path: ['items'] });
