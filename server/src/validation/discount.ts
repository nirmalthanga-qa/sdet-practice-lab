import { z } from 'zod';

export const discountCodeSchema = z.string().trim().toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{2,31}$/, 'Use 3–32 letters, digits or hyphens; start with a letter or digit.');
const common = {
  code: discountCodeSchema,
  minimumSubtotalPaise: z.number().int().min(0).max(2_147_483_647).default(0),
  expiresAt: z.iso.datetime({ offset: true, precision: 0 })
    .refine((value) => Date.parse(value) > Date.now(), 'Expiry must be in the future.'),
  isActive: z.boolean().default(true),
};
export const createDiscountSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...common, type: z.literal('PERCENTAGE'), percent: z.number().int().min(1).max(100) }),
  z.strictObject({ ...common, type: z.literal('FIXED'), amountPaise: z.number().int().min(1).max(2_147_483_647) }),
]);
export const discountStatusSchema = z.strictObject({ isActive: z.boolean() });
