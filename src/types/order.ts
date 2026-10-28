import type { DeliveryDetails } from './delivery';

export type CheckoutItem = {
  productId: string;
  quantity: number;
  unitPricePaise: number;
};

export type CheckoutRequest = {
  checkoutId: string;
  paymentMethod: 'simulated';
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
  status: 'CONFIRMED';
  paymentStatus: 'SIMULATED_PAID';
  currency: 'INR';
  subtotalPaise: number;
  totalPaise: number;
  createdAt: string;
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
  itemCount: number;
};