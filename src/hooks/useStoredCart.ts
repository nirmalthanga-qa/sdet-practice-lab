import { useEffect, useState } from 'react';
import type { CartItem } from '../api/cart';

const STORAGE_KEY = 'sdet-practice-lab-cart-v1';

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

function cartSignature(items: CartItem[]): string {
  return JSON.stringify(
    items
      .map(({ productId, quantity }) => ({
        productId,
        quantity,
      }))
      .sort((a, b) =>
        a.productId < b.productId
          ? -1
          : a.productId > b.productId
            ? 1
            : 0,
      ),
  );
}

function loadCart(): CartItem[] {
  try {
    const savedCart = localStorage.getItem(STORAGE_KEY);

    if (!savedCart) {
      return [];
    }

    const parsed: unknown = JSON.parse(savedCart);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validItems: CartItem[] = [];
    const seenProductIds = new Set<string>();

    for (const item of parsed) {
      if (!isCartItem(item)) {
        continue;
      }

      if (seenProductIds.has(item.productId)) {
        continue;
      }

      validItems.push({
        productId: item.productId,
        quantity: item.quantity,
      });

      seenProductIds.add(item.productId);
    }

    return validItems;
  } catch {
    return [];
  }
}

export function useStoredCart() {
  const [cartItems, setCartItems] =
    useState<CartItem[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cartItems),
      );
    } catch {
      console.warn(
        'Cart could not be saved. It will remain available on this page.',
      );
    }
  }, [cartItems]);

  function clearTransferredGuestCart(
    snapshot: CartItem[],
  ): boolean {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? '[]',
      );

      if (
        !Array.isArray(saved) ||
        !saved.every(isCartItem)
      ) {
        return false;
      }

      // Preserve guest items if the saved cart changed
      // after the transfer snapshot was created.
      if (
        saved.length > 0 &&
        cartSignature(saved) !== cartSignature(snapshot)
      ) {
        return false;
      }

      // Persist cleanup before removing the pending transfer record.
      localStorage.setItem(STORAGE_KEY, '[]');
      setCartItems([]);

      return true;
    } catch {
      return false;
    }
  }

  return {
    cartItems,
    setCartItems,
    clearTransferredGuestCart,
  };
}