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
    customerCart,
  } = cart;

  const products =
    catalogueState.status === 'success'
      ? catalogueState.products
      : [];

  const isCartSaving = customerCart?.isSaving ?? false;

  const canEditCart =
    catalogueState.status === 'success' &&
    (customerCart === null || customerCart.canEdit);

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
    canEditCart &&
    cartItems.length > 0 &&
    !hasCartIssues;

  async function addToCart(requestedProduct: Product): Promise<boolean> {
    if (!canEditCart) {
      return false;
    }

    const product = products.find(
      (item) => item.id === requestedProduct.id,
    );

    if (!product || product.stock < 1) {
      return false;
    }

    const currentQuantity =
      cartItems.find((item) => item.productId === product.id)
        ?.quantity ?? 0;

    if (currentQuantity >= product.stock) {
      return false;
    }

    if (customerCart) {
      return customerCart.setQuantity(
        product.id,
        currentQuantity + 1,
      );
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.productId === product.id,
      );

      if ((existingItem?.quantity ?? 0) >= product.stock) {
        return currentItems;
      }

      return existingItem
        ? currentItems.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...currentItems, { productId: product.id, quantity: 1 }];
    });

    return true;
  }

  async function updateCartQuantity(
    productId: string,
    quantity: number,
  ): Promise<boolean> {
    if (!canEditCart) {
      return false;
    }

    const product = products.find((item) => item.id === productId);

    if (
      !product ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > product.stock
    ) {
      return false;
    }

    if (customerCart) {
      return customerCart.setQuantity(productId, quantity);
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity }
          : item,
      ),
    );

    return true;
  }

  async function removeFromCart(productId: string): Promise<boolean> {
    if (!canEditCart) {
      return false;
    }

    if (customerCart) {
      return customerCart.removeItem(productId);
    }

    setCartItems((currentItems) =>
      currentItems.filter((item) => item.productId !== productId),
    );

    return true;
  }

  async function clearCart(): Promise<boolean> {
    if (!canEditCart) {
      return false;
    }

    if (customerCart) {
      return customerCart.clearCart();
    }

    setCartItems([]);
    return true;
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
    canEditCart,
    isCartSaving,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  };
}