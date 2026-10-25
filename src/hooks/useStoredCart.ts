import { useEffect, useState } from 'react';
import { products } from '../data/products';

type CartItem = {
  productId: string;
  quantity: number;
};

const STORAGE_KEY = 'sdet-practice-lab-cart-v1';

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
      if (
        typeof item !== 'object' ||
        item === null ||
        !('productId' in item) ||
        !('quantity' in item) ||
        typeof item.productId !== 'string' ||
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        continue;
      }

      const product = products.find(
        (product) => product.id === item.productId,
      );

      if (
        !product ||
        product.stock === 0 ||
        seenProductIds.has(product.id)
      ) {
        continue;
      }

      validItems.push({
        productId: product.id,
        quantity: Math.min(item.quantity, product.stock),
      });

      seenProductIds.add(product.id);
    }

    return validItems;
  } catch {
    return [];
  }
}

export function useStoredCart() 
{  const [cartItems, setCartItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      console.warn(
        'Cart could not be saved. It will remain available on this page.',
      );
    }
  }, [cartItems]);

  return { cartItems, setCartItems };
}