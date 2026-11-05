import type { DeliveryDetails } from './delivery';

export type CheckoutItem = {
  productId: string;
  quantity: number;
  unitPricePaise: number;
};

export type CheckoutRequest = {
  checkoutId: string;
  paymentMethod: 'simulated';
  discountCode?: string;
  expectedDiscountPaise?: number;
  delivery: DeliveryDetails;
  items: CheckoutItem[];
};

export type OrderItem = {
  productId: string;
  productName: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
};

export type Order = {
  id: string;
  status: 'CONFIRMED' | 'CANCELLED';
  paymentStatus: 'SIMULATED_PAID';
  currency: 'INR';
  discountCode: string | null;
  discountType: 'PERCENTAGE' | 'FIXED' | null;
  discountValue: number | null;
  discountPaise: number;
  subtotalPaise: number;
  totalPaise: number;
  createdAt: string;
  cancelledAt: string | null;
  delivery: DeliveryDetails;
  items: OrderItem[];
};

export type OrderSummary = {
  id: string;
  status: Order['status'];
  paymentStatus: Order['paymentStatus'];
  currency: Order['currency'];
  totalPaise: number;
  createdAt: string;
  cancelledAt: string | null;
  itemCount: number;
};
export type DiscountQuote = {
  discountCode: string; discountPaise: number; subtotalPaise: number; totalPaise: number;
};
export function checkoutItemsKey(items: CheckoutItem[]): string {
  return JSON.stringify([...items].sort((a, b) => a.productId.localeCompare(b.productId))
    .map(({ productId, quantity, unitPricePaise }) => ({ productId, quantity, unitPricePaise })));
}
