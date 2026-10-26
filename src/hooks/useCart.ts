import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import type { Product } from '../types/product';

export function useCart() {
  const cart = useContext(CartContext);

  if (cart === null) {
    throw new Error('useCart must be used inside CartProvider');
  }

  const {
    cartItems,
    setCartItems,
    catalogueState,
    retryCatalogue,
  } = cart;

  const products =
    catalogueState.status === 'success'
      ? catalogueState.products
      : [];

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

  const unavailableItems =
    catalogueState.status === 'success'
      ? cartItems.filter(
          (item) =>
            !products.some(
              (product) => product.id === item.productId,
            ),
        )
      : [];

  const hasCartIssues =
    unavailableItems.length > 0 ||
    cartProducts.some(
      ({ product, quantity }) => quantity > product.stock,
    );

  const canCheckout =
    catalogueState.status === 'success' &&
    cartItems.length > 0 &&
    !hasCartIssues;

  function addToCart(requestedProduct: Product) {
    const product = products.find(
      (item) => item.id === requestedProduct.id,
    );

    if (!product || product.stock < 1) {
      return;
    }

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
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      return;
    }

    setCartItems((currentItems) => {
      const currentItem = currentItems.find(
        (item) => item.productId === productId,
      );

      if (!currentItem) {
        return currentItems;
      }

      // Allow reducing an existing excess quantity one step at a time.
      if (
        quantity > product.stock &&
        quantity >= currentItem.quantity
      ) {
        return currentItems;
      }

      return currentItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity }
          : item,
      );
    });
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
    catalogueState,
    retryCatalogue,
    unavailableItems,
    hasCartIssues,
    canCheckout,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  };
}