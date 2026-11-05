import { z } from 'zod';
export const categoryName = z.string()
  .transform((value) => value.normalize('NFC').trim().replace(/\s+/g, ' '))
  .pipe(z.string().min(1).max(60).regex(/^[\p{L}\p{N}][\p{L}\p{N} &()'-]*$/u,
    'Use letters, numbers, spaces, &, parentheses, apostrophes or hyphens.'));
export const createCategorySchema = z.strictObject({ name: categoryName });
