import { createContext } from 'react';
import type { useStoredCart } from '../hooks/useStoredCart';
import type { Product } from '../types/product';

export type CartCatalogueState =
  | { status: 'loading' }
  | { status: 'success'; products: Product[] }
  | { status: 'error'; message: string };

type CartContextValue = ReturnType<typeof useStoredCart> & {
  catalogueState: CartCatalogueState;
  retryCatalogue: () => void;
};

export const CartContext =
  createContext<CartContextValue | null>(null);