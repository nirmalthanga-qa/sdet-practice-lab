import { useEffect, useRef, useState } from 'react';
import {
  CartApiError,
  clearCustomerCart,
  getCustomerCart,
  removeCustomerCartItem,
  setCustomerCartQuantity,
  transferGuestCart,
} from '../api/cart';
import type {
  CartItem,
  CartTransferRequest,
} from '../api/cart';

type CustomerCartState =
  | { status: 'loading' }
  | { status: 'ready'; items: CartItem[] }
  | {
      status: 'error';
      message: string;
      sessionExpired: boolean;
    };

function getErrorMessage(error: unknown): string {
  if (error instanceof CartApiError) {
    return error.message;
  }

  return 'We couldn’t connect to your cart. Please try again.';
}

// This hook is mounted inside a provider keyed by the customer ID.
export function useCustomerCart() {
  const [cartState, setCartState] =
    useState<CustomerCartState>({ status: 'loading' });

  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);

  const savingRef = useRef(false);
  const mutationControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCart() {
      try {
        const items = await getCustomerCart(controller.signal);

        if (!controller.signal.aborted) {
          setCartState({
            status: 'ready',
            items,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setCartState({
            status: 'error',
            message: getErrorMessage(error),
            sessionExpired:
              error instanceof CartApiError &&
              error.status === 401,
          });
        }
      }
    }

    void loadCart();

    return () => controller.abort();
  }, [requestVersion]);

  useEffect(() => {
    return () => {
      mutationControllerRef.current?.abort();
    };
  }, []);

  function reloadCart() {
    if (savingRef.current) {
      return;
    }

    setMutationError('');
    setNeedsReload(false);
    setSessionExpired(false);
    setCartState({ status: 'loading' });
    setRequestVersion((current) => current + 1);
  }

  async function saveChange(
    operation: (signal: AbortSignal) => Promise<void>,
  ): Promise<boolean> {
    if (
      savingRef.current ||
      cartState.status !== 'ready' ||
      needsReload ||
      sessionExpired
    ) {
      return false;
    }

    const controller = new AbortController();
    mutationControllerRef.current = controller;

    savingRef.current = true;
    setIsSaving(true);
    setMutationError('');

    try {
      await operation(controller.signal);

      // Read the server's current cart after the write succeeds.
      const items = await getCustomerCart(controller.signal);

      if (controller.signal.aborted) {
        return false;
      }

      setCartState({
        status: 'ready',
        items,
      });

      return true;
    } catch (error) {
      if (!controller.signal.aborted) {
        setSessionExpired(
          error instanceof CartApiError &&
          error.status === 401,
        );

        setMutationError(getErrorMessage(error));

        // The server might have saved the change before the
        // connection failed. Reload before editing again.
        setNeedsReload(true);
      }

      return false;
    } finally {
      if (mutationControllerRef.current === controller) {
        mutationControllerRef.current = null;
        savingRef.current = false;

        if (!controller.signal.aborted) {
          setIsSaving(false);
        }
      }
    }
  }

  async function setQuantity(
    productId: string,
    quantity: number,
  ): Promise<boolean> {
    if (
      !productId ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      setMutationError(
        'Quantity must be a positive whole number.',
      );
      return false;
    }

    return saveChange(async (signal) => {
      await setCustomerCartQuantity(
        productId,
        quantity,
        signal,
      );
    });
  }

  async function removeItem(
    productId: string,
  ): Promise<boolean> {
    return saveChange((signal) =>
      removeCustomerCartItem(productId, signal),
    );
  }

  async function clearCart(): Promise<boolean> {
    return saveChange((signal) =>
      clearCustomerCart(signal),
    );
  }

  async function transferItems(
    transfer: CartTransferRequest,
  ): Promise<boolean> {
    return saveChange(async (signal) => {
      await transferGuestCart(transfer, signal);
    });
  }

  const cartItems =
    cartState.status === 'ready' ? cartState.items : [];

  const canEdit =
    cartState.status === 'ready' &&
    !isSaving &&
    !needsReload &&
    !sessionExpired;

  return {
    cartState,
    cartItems,
    isSaving,
    mutationError,
    needsReload,
    sessionExpired:
      sessionExpired ||
      (cartState.status === 'error' &&
        cartState.sessionExpired),
    canEdit,
    reloadCart,
    setQuantity,
    removeItem,
    clearCart,
    transferItems,
  };
}