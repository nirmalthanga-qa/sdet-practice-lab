import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStoredCart } from '../hooks/useStoredCart';
import { useCustomerCart } from '../hooks/useCustomerCart';
import { isProduct } from '../utils/isProduct';
import { CartContext } from './CartContext';
import type { CartCatalogueState } from './CartContext';

type CartProviderProps = {
  children: ReactNode;
};

type CustomerCartProviderProps = CartProviderProps & {
  guestCart: ReturnType<typeof useStoredCart>;
  catalogueState: CartCatalogueState;
  retryCatalogue: () => void;
};

function CustomerCartProvider({
  children,
  guestCart,
  catalogueState,
  retryCatalogue,
}: CustomerCartProviderProps) {
  const customerCart = useCustomerCart();
  const { refreshAuth } = useAuth();

  let effectiveCatalogueState = catalogueState;

  if (customerCart.cartState.status === 'loading') {
    effectiveCatalogueState = {
      status: 'loading',
    };
  } else if (customerCart.cartState.status === 'error') {
    effectiveCatalogueState = {
      status: 'error',
      message: customerCart.cartState.message,
    };
  } else if (customerCart.needsReload) {
    effectiveCatalogueState = {
      status: 'error',
      message:
        customerCart.mutationError ||
        'Please reload your cart before making more changes.',
    };
  }

  function retry() {
    if (customerCart.sessionExpired) {
      refreshAuth();
      return;
    }

    customerCart.reloadCart();
    retryCatalogue();
  }

  return (
    <CartContext.Provider
      value={{
        ...guestCart,
        cartItems: customerCart.cartItems,
        guestCartItems: guestCart.cartItems,
        catalogueState: effectiveCatalogueState,
        retryCatalogue: retry,
        customerCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export default function CartProvider({
  children,
}: CartProviderProps) {
  const { authState, refreshAuth } = useAuth();
  const guestCart = useStoredCart();

  const [catalogueState, setCatalogueState] =
    useState<CartCatalogueState>({
      status: 'loading',
    });

  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalogue() {
      try {
        const response = await fetch('/api/products', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Catalogue request failed');
        }

        const data: unknown = await response.json();

        if (
          typeof data !== 'object' ||
          data === null ||
          !('products' in data) ||
          !Array.isArray(data.products) ||
          !data.products.every(isProduct)
        ) {
          throw new Error('Invalid catalogue response');
        }

        const productIds = new Set(
          data.products.map((product) => product.id),
        );

        if (productIds.size !== data.products.length) {
          throw new Error('Duplicate product IDs');
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
              'We couldn’t load cart prices and availability. Please try again.',
          });
        }
      }
    }

    void loadCatalogue();

    return () => controller.abort();
  }, [requestVersion]);

  function retryCatalogue() {
    setCatalogueState({
      status: 'loading',
    });

    setRequestVersion((current) => current + 1);
  }

  if (authState.status === 'authenticated') {
    return (
      <CustomerCartProvider
        key={authState.user.id}
        guestCart={guestCart}
        catalogueState={catalogueState}
        retryCatalogue={retryCatalogue}
      >
        {children}
      </CustomerCartProvider>
    );
  }

  const isGuest = authState.status === 'anonymous';

  const effectiveCatalogueState: CartCatalogueState =
    authState.status === 'loading'
      ? {
          status: 'loading',
        }
      : authState.status === 'error'
        ? {
            status: 'error',
            message: authState.message,
          }
        : catalogueState;

  return (
    <CartContext.Provider
      value={{
        ...guestCart,
        cartItems: isGuest ? guestCart.cartItems : [],
        guestCartItems: guestCart.cartItems,
        catalogueState: effectiveCatalogueState,
        retryCatalogue:
          authState.status === 'error'
            ? refreshAuth
            : retryCatalogue,
        customerCart: null,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}