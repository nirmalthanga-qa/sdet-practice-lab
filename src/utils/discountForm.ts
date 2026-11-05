import type { NewDiscount } from '../api/discounts';
export type DiscountFormValues = {
  code: string; type: 'PERCENTAGE' | 'FIXED'; value: string;
  minimum: string; expiresAt: string; isActive: boolean;
};
export function rupeesToPaise(value: string): number {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) throw new Error('Enter a non-negative rupee amount with at most two decimal places.');
  const [whole, fraction = ''] = trimmed.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > 2_147_483_647) throw new Error('Amounts must not exceed ₹21,474,836.47.');
  return amount;
}
export function buildDiscount(values: DiscountFormValues, now = Date.now()): NewDiscount {
  const code = values.code.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) throw new Error('Use a code of 3–32 letters, digits or hyphens, starting with a letter or digit.');
  const expiry = new Date(values.expiresAt);
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= now) throw new Error('Choose an expiry date and time in the future.');
  const common = { code, minimumSubtotalPaise: rupeesToPaise(values.minimum),
    expiresAt: expiry.toISOString().replace(/\.\d{3}Z$/, 'Z'), isActive: values.isActive };
  if (values.type === 'PERCENTAGE') {
    const percent = Number(values.value);
    if (!/^\d+$/.test(values.value) || !Number.isInteger(percent) || percent < 1 || percent > 100)
      throw new Error('Enter a whole-number percentage from 1 to 100.');
    return { ...common, type: 'PERCENTAGE', percent };
  }
  const amountPaise = rupeesToPaise(values.value);
  if (amountPaise < 1) throw new Error('The fixed discount must be at least ₹0.01.');
  return { ...common, type: 'FIXED', amountPaise };
}
