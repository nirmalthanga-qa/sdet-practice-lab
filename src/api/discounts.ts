import { z } from 'zod';
const amount = z.number().int().min(0).max(2_147_483_647);
const date = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const discountSchema = z.object({
  code: z.string().regex(/^[A-Z0-9][A-Z0-9-]{2,31}$/),
  type: z.enum(['PERCENTAGE', 'FIXED']), percent: z.number().int().min(1).max(100).nullable(),
  amountPaise: amount.nullable(), minimumSubtotalPaise: amount,
  expiresAt: date, isActive: z.boolean(), createdAt: date, updatedAt: date,
}).refine((d) => d.type === 'PERCENTAGE'
  ? d.percent !== null && d.amountPaise === null
  : d.percent === null && d.amountPaise !== null && d.amountPaise > 0);
export type Discount = z.infer<typeof discountSchema>;
export type NewDiscount = {
  code: string; minimumSubtotalPaise: number; expiresAt: string; isActive: boolean;
} & ({ type: 'PERCENTAGE'; percent: number } | { type: 'FIXED'; amountPaise: number });
export class DiscountApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = 'DiscountApiError'; this.status = status; }
}
async function check(response: Response) {
  if (response.ok) return;
  let message = 'The request could not be confirmed. Reload discounts before trying again.';
  try {
    const body = z.object({ error: z.object({ message: z.string() }) }).safeParse(await response.json());
    if (body.success) message = body.data.error.message;
  } catch { /* Keep the fallback for non-JSON error responses. */ }
  throw new DiscountApiError(message, response.status);
}
export async function listDiscounts(signal: AbortSignal): Promise<Discount[]> {
  const response = await fetch('/api/admin/discounts', { credentials: 'same-origin', cache: 'no-store', signal });
  await check(response);
  const body = z.object({ discounts: z.array(discountSchema) }).safeParse(await response.json());
  if (!body.success || new Set(body.data.discounts.map((item) => item.code)).size !== body.data.discounts.length)
    throw new Error('Invalid discount list. Please reload.');
  return body.data.discounts;
}
export async function createDiscount(input: NewDiscount, signal: AbortSignal): Promise<Discount> {
  const response = await fetch('/api/admin/discounts', {
    method: 'POST', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  await check(response);
  const body = z.object({ discount: discountSchema }).safeParse(await response.json());
  if (response.status !== 201 || !body.success || body.data.discount.code !== input.code)
    throw new Error('Creation could not be confirmed. Reload discounts before retrying with the same code.');
  return body.data.discount;
}
export async function changeDiscountStatus(code: string, isActive: boolean, signal: AbortSignal): Promise<Discount> {
  const response = await fetch(`/api/admin/discounts/${encodeURIComponent(code)}/status`, {
    method: 'PATCH', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }),
  });
  await check(response);
  const body = z.object({ discount: discountSchema }).safeParse(await response.json());
  if (!body.success || body.data.discount.code !== code || body.data.discount.isActive !== isActive)
    throw new Error('Status update could not be confirmed. Reload discounts.');
  return body.data.discount;
}


export async function deleteDiscount(code: string, signal: AbortSignal): Promise<'deleted' | 'missing'> {
  const response = await fetch(`/api/admin/discounts/${encodeURIComponent(code)}`, {
    method: 'DELETE', credentials: 'same-origin', signal,
  });
  if (response.status === 204) return 'deleted';
  if (response.status === 404) return 'missing';
  await check(response);
  throw new Error('Deletion could not be confirmed. Reload discounts before trying again.');
}
