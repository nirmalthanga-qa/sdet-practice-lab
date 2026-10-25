import { createContext } from 'react';
import type { useStoredCart } from '../hooks/useStoredCart';

type CartContextValue = ReturnType<typeof useStoredCart>;

export const CartContext = createContext<CartContextValue | null>(null);