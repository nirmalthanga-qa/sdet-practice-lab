import type { ReactNode } from 'react';
import { useStoredCart } from '../hooks/useStoredCart';
import { CartContext } from './CartContext';

type CartProviderProps = {
  children: ReactNode;
};

export default function CartProvider({ children }: CartProviderProps) {
  const cart = useStoredCart();

  return (
    <CartContext.Provider value={cart}>
      {children}
    </CartContext.Provider>
  );
}