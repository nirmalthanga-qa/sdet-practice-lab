import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { products } from '../data/products';
import type { Product } from '../types/product';

export function useCart() {
  const cart = useContext(CartContext);

  if (cart === null) {
    throw new Error('useCart must be used inside CartProvider');
  }

  const { cartItems, setCartItems } = cart;

  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const cartProducts = cartItems.flatMap((item) => {
    const product = products.find(
      (product) => product.id === item.productId,
    );

    return product ? [{ product, quantity: item.quantity }] : [];
  });

  function addToCart(product: Product) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.productId === product.id,
      );

      const currentQuantity = existingItem?.quantity ?? 0;

      if (currentQuantity >= product.stock) {
        return currentItems;
      }

      if (existingItem) {
        return currentItems.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentItems, { productId: product.id, quantity: 1 }];
    });
  }

  function updateCartQuantity(productId: string, quantity: number) {
    const product = products.find((item) => item.id === productId);

    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > product.stock
    ) {
      return;
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity }
          : item,
      ),
    );
  }

  function removeFromCart(productId: string) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.productId !== productId),
    );
  }

  function clearCart() {
    setCartItems([]);
  }

  return {
    cartItems,
    cartCount,
    cartProducts,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  };
}