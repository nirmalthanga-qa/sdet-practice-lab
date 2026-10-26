import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useStoredCart } from '../hooks/useStoredCart';
import { isProduct } from '../utils/isProduct';
import { CartContext } from './CartContext';
import type { CartCatalogueState } from './CartContext';

type CartProviderProps = {
  children: ReactNode;
};

export default function CartProvider({
  children,
}: CartProviderProps) {
  const cart = useStoredCart();

  const [catalogueState, setCatalogueState] =
    useState<CartCatalogueState>({ status: 'loading' });

  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalogue() {
      try {
        const response = await fetch('/api/products', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Cart catalogue request failed: ${response.status}`,
          );
        }

        const data: unknown = await response.json();

        if (
          typeof data !== 'object' ||
          data === null ||
          !('products' in data) ||
          !Array.isArray(data.products) ||
          !data.products.every(isProduct)
        ) {
          throw new Error('Invalid cart catalogue response');
        }

        const productIds = new Set(
          data.products.map((product) => product.id),
        );

        if (productIds.size !== data.products.length) {
          throw new Error('Duplicate product IDs in catalogue');
        }

        if (!controller.signal.aborted) {
          setCatalogueState({
            status: 'success',
            products: data.products,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setCatalogueState({
            status: 'error',
            message:
              'We couldn’t load the latest cart prices and availability. Please try again.',
          });
        }
      }
    }

    void loadCatalogue();

    return () => controller.abort();
  }, [requestVersion]);

  function retryCatalogue() {
    setCatalogueState({ status: 'loading' });
    setRequestVersion((current) => current + 1);
  }

  return (
    <CartContext.Provider
      value={{
        ...cart,
        catalogueState,
        retryCatalogue,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}