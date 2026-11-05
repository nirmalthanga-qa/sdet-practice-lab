import type {
  CheckoutRequest,
  CheckoutItem,
  DiscountQuote,
  Order,
  OrderItem,
  OrderSummary,
} from '../types/order';
import type { DeliveryDetails } from '../types/delivery';

export class OrderApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);

    this.name = 'OrderApiError';
    this.status = status;
    this.code = code;
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isDateString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value))
  );
}

function isDeliveryDetails(
  value: unknown,
): value is DeliveryDetails {
  return (
    isRecord(value) &&
    isNonEmptyString(value.fullName) &&
    isNonEmptyString(value.email) &&
    isNonEmptyString(value.address) &&
    isNonEmptyString(value.city) &&
    typeof value.postalCode === 'string' &&
    /^[1-9][0-9]{5}$/.test(value.postalCode)
  );
}

function isOrderItem(value: unknown): value is OrderItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.productId) &&
    isNonEmptyString(value.productName) &&
    isNonNegativeInteger(value.unitPricePaise) &&
    isPositiveInteger(value.quantity) &&
    isNonNegativeInteger(value.lineTotalPaise) &&
    value.lineTotalPaise ===
      value.unitPricePaise * value.quantity
  );
}

function isOrder(value: unknown): value is Order {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    (value.status !== 'CONFIRMED' && value.status !== 'CANCELLED') ||
    (value.status === 'CANCELLED' ? !isDateString(value.cancelledAt) : value.cancelledAt !== null) ||
    value.paymentStatus !== 'SIMULATED_PAID' ||
    value.currency !== 'INR' ||
    !isNonNegativeInteger(value.discountPaise) ||
    !isNonNegativeInteger(value.subtotalPaise) ||
    !isNonNegativeInteger(value.totalPaise) ||
    !isDateString(value.createdAt) ||
    !isDeliveryDetails(value.delivery) ||
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    !value.items.every(isOrderItem)
  ) {
    return false;
  }

  const productIds = new Set(
    value.items.map((item) => item.productId),
  );

  const calculatedSubtotal = value.items.reduce(
    (total, item) => total + item.lineTotalPaise,
    0,
  );

  return (
    productIds.size === value.items.length &&
    Number.isSafeInteger(calculatedSubtotal) &&
    calculatedSubtotal === value.subtotalPaise &&
    value.discountPaise <= value.subtotalPaise &&
    value.totalPaise === value.subtotalPaise - value.discountPaise &&
    (value.discountCode === null
      ? value.discountType === null && value.discountValue === null && value.discountPaise === 0
      : isNonEmptyString(value.discountCode) && isPositiveInteger(value.discountValue) &&
        ((value.discountType === 'PERCENTAGE' && value.discountValue <= 100 && value.discountPaise === Math.floor(value.subtotalPaise * value.discountValue / 100)) ||
         (value.discountType === 'FIXED' && value.discountPaise === Math.min(value.subtotalPaise, value.discountValue))))
  );
}

function isOrderSummary(value: unknown): value is OrderSummary {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.status === 'CONFIRMED' || value.status === 'CANCELLED') &&
    (value.status === 'CANCELLED' ? isDateString(value.cancelledAt) : value.cancelledAt === null) &&
    value.paymentStatus === 'SIMULATED_PAID' &&
    value.currency === 'INR' &&
    isNonNegativeInteger(value.totalPaise) &&
    isDateString(value.createdAt) &&
    isPositiveInteger(value.itemCount)
  );
}

async function createResponseError(
  response: Response,
): Promise<OrderApiError> {
  let message =
    response.status === 401
      ? 'Your session has expired. Please sign in again.'
      : 'We couldn’t complete your order request. Please try again.';

  let code =
    response.status === 401
      ? 'UNAUTHENTICATED'
      : 'ORDER_REQUEST_FAILED';

  try {
    const data: unknown = await response.json();

    if (isRecord(data) && isRecord(data.error)) {
      if (isNonEmptyString(data.error.message)) {
        message = data.error.message;
      }

      if (isNonEmptyString(data.error.code)) {
        code = data.error.code;
      }
    }
  } catch {
    // Keep the fallback message if the error response is not JSON.
  }

  return new OrderApiError(message, response.status, code);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const data: unknown = await response.json();
    return data;
  } catch {
    throw new OrderApiError(
      'We couldn’t read the order response.',
      response.status,
      'INVALID_ORDER_RESPONSE',
    );
  }
}

async function readOrder(response: Response): Promise<Order> {
  const data = await readJson(response);

  if (!isRecord(data) || !isOrder(data.order)) {
    throw new OrderApiError(
      'We couldn’t confirm the order response.',
      response.status,
      'INVALID_ORDER_RESPONSE',
    );
  }

  return data.order;
}

export async function placeOrder(
  checkout: CheckoutRequest,
  signal?: AbortSignal,
): Promise<Order> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(checkout),
    signal,
  });

  if (!response.ok) {
    throw await createResponseError(response);
  }

  return readOrder(response);
}

export async function getOrder(
  orderId: string,
  signal?: AbortSignal,
): Promise<Order> {
  const response = await fetch(
    `/api/orders/${encodeURIComponent(orderId)}`,
    {
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    },
  );

  if (!response.ok) {
    throw await createResponseError(response);
  }

  const order = await readOrder(response);

  if (order.id !== orderId) {
    throw new OrderApiError(
      'The returned order does not match the requested order.',
      response.status,
      'INVALID_ORDER_RESPONSE',
    );
  }

  return order;
}

export async function getOrders(
  signal?: AbortSignal,
): Promise<OrderSummary[]> {
  const response = await fetch('/api/orders', {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw await createResponseError(response);
  }

  const data = await readJson(response);

  if (
    !isRecord(data) ||
    !Array.isArray(data.orders) ||
    !data.orders.every(isOrderSummary)
  ) {
    throw new OrderApiError(
      'We couldn’t read your order history.',
      response.status,
      'INVALID_ORDER_RESPONSE',
    );
  }

  const orderIds = new Set(
    data.orders.map((order) => order.id),
  );

  if (orderIds.size !== data.orders.length) {
    throw new OrderApiError(
      'The order history contains duplicate orders.',
      response.status,
      'INVALID_ORDER_RESPONSE',
    );
  }

  return data.orders;
}

export async function quoteDiscount(discountCode: string, items: CheckoutItem[], signal: AbortSignal): Promise<DiscountQuote> {
  const response = await fetch('/api/orders/quote', {
    method: 'POST', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discountCode, items }),
  });
  if (!response.ok) throw await createResponseError(response);
  const body: unknown = await readJson(response);
  if (!isRecord(body) || !isRecord(body.quote)) throw new Error('Invalid discount quote. Please try again.');
  const quote = body.quote;
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPricePaise, 0);
  if (quote.discountCode !== discountCode || !isNonNegativeInteger(quote.discountPaise) ||
    !isNonNegativeInteger(quote.subtotalPaise) || quote.subtotalPaise !== subtotal || quote.discountPaise > subtotal ||
    !isNonNegativeInteger(quote.totalPaise) || quote.totalPaise !== subtotal - quote.discountPaise)
    throw new Error('Invalid discount quote. Please try again.');
  return { discountCode, discountPaise: quote.discountPaise, subtotalPaise: quote.subtotalPaise, totalPaise: quote.totalPaise };
}


export async function cancelOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  });
  if (!response.ok) throw await createResponseError(response);
  const order = await readOrder(response);
  if (order.id !== orderId || order.status !== 'CANCELLED')
    throw new OrderApiError('Cancellation could not be confirmed. Retry for this same order.', response.status, 'INVALID_ORDER_RESPONSE');
  return order;
}
