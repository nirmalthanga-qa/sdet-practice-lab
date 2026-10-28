export type CartItem = {
  productId: string;
  quantity: number;
};

export class CartApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CartApiError';
    this.status = status;
  }
}

function isCartItem(value: unknown): value is CartItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'productId' in value &&
    typeof value.productId === 'string' &&
    value.productId.trim() !== '' &&
    'quantity' in value &&
    typeof value.quantity === 'number' &&
    Number.isSafeInteger(value.quantity) &&
    value.quantity > 0
  );
}

async function createResponseError(
  response: Response,
): Promise<CartApiError> {
  let message =
    response.status === 401
      ? 'Your session has expired. Please sign in again.'
      : 'We couldn’t update or load your cart. Please try again.';

  try {
    const data: unknown = await response.json();

    if (
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'object' &&
      data.error !== null &&
      'message' in data.error &&
      typeof data.error.message === 'string'
    ) {
      message = data.error.message;
    }
  } catch {
    // Keep the fallback message if the response is not valid JSON.
  }

  return new CartApiError(message, response.status);
}

export async function getCustomerCart(
  signal?: AbortSignal,
): Promise<CartItem[]> {
  const response = await fetch('/api/cart', {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw await createResponseError(response);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== 'object' ||
    data === null ||
    !('items' in data) ||
    !Array.isArray(data.items) ||
    !data.items.every(isCartItem)
  ) {
    throw new CartApiError('Invalid cart response.', response.status);
  }

  const productIds = new Set(
    data.items.map((item) => item.productId),
  );

  if (productIds.size !== data.items.length) {
    throw new CartApiError(
      'The cart response contains duplicate products.',
      response.status,
    );
  }

  return data.items;
}

export async function setCustomerCartQuantity(
  productId: string,
  quantity: number,
  signal?: AbortSignal,
): Promise<CartItem> {
  const response = await fetch(
    `/api/cart/items/${encodeURIComponent(productId)}`,
    {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity }),
      signal,
    },
  );

  if (!response.ok) {
    throw await createResponseError(response);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== 'object' ||
    data === null ||
    !('item' in data) ||
    !isCartItem(data.item) ||
    data.item.productId !== productId ||
    data.item.quantity !== quantity
  ) {
    throw new CartApiError(
      'Invalid cart update response.',
      response.status,
    );
  }

  return data.item;
}

export async function removeCustomerCartItem(
  productId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    `/api/cart/items/${encodeURIComponent(productId)}`,
    {
      method: 'DELETE',
      credentials: 'same-origin',
      signal,
    },
  );

  if (response.status !== 204) {
    throw await createResponseError(response);
  }
}

export async function clearCustomerCart(
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/cart', {
    method: 'DELETE',
    credentials: 'same-origin',
    signal,
  });

  if (response.status !== 204) {
    throw await createResponseError(response);
  }
}

export type CartTransferRequest = {
  transferId: string;
  items: CartItem[];
};

export type CartTransferResult = {
  transferId: string;
  transferredProductCount: number;
};

export async function transferGuestCart(
  transfer: CartTransferRequest,
  signal?: AbortSignal,
): Promise<CartTransferResult> {
  const response = await fetch('/api/cart/transfer', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transfer),
    signal,
  });

  if (!response.ok) {
    throw await createResponseError(response);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== 'object' ||
    data === null ||
    !('transferId' in data) ||
    data.transferId !== transfer.transferId ||
    !('transferredProductCount' in data) ||
    typeof data.transferredProductCount !== 'number' ||
    !Number.isSafeInteger(data.transferredProductCount) ||
    data.transferredProductCount !== transfer.items.length
  ) {
    throw new CartApiError(
      'We couldn’t confirm the transfer response. Retry the same transfer.',
      response.status,
    );
  }

  return {
    transferId: transfer.transferId,
    transferredProductCount: data.transferredProductCount,
  };
}