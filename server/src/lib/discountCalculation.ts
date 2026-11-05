export class DiscountError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = 'DiscountError'; this.code = code; }
}
type DiscountTerms = {
  code: string; type: 'PERCENTAGE' | 'FIXED'; percent: number | null; amountPaise: number | null;
  minimumSubtotalPaise: number; expiresAt: Date; isActive: boolean;
};
export function calculateDiscount(discount: DiscountTerms | null, subtotalPaise: number, now: number) {
  if (!Number.isSafeInteger(subtotalPaise) || subtotalPaise < 0 || subtotalPaise > 2_147_483_647) throw new Error('Invalid subtotal');
  if (!discount || !discount.isActive || discount.expiresAt.getTime() <= now)
    throw new DiscountError('DISCOUNT_UNAVAILABLE', 'This discount code is invalid, inactive or expired. Remove it or choose another code.');
  if (subtotalPaise < discount.minimumSubtotalPaise)
    throw new DiscountError('DISCOUNT_MINIMUM_NOT_MET', 'Your subtotal is below the minimum required for this discount.');
  const value = discount.type === 'PERCENTAGE' ? discount.percent : discount.amountPaise;
  if (value === null || !Number.isSafeInteger(value) || value < 1 ||
      (discount.type === 'PERCENTAGE' && value > 100)) throw new Error('Invalid stored discount');
  const amount = discount.type === 'PERCENTAGE' ? Math.floor(subtotalPaise * value / 100) : value;
  return { discountCode: discount.code, discountType: discount.type, discountValue: value,
    discountPaise: Math.min(amount, subtotalPaise) };
}
