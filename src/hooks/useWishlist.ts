import { useContext } from 'react';
import { WishlistContext } from '../context/WishlistContext';
export function useWishlist() {
  const value = useContext(WishlistContext);
  if (!value) throw new Error('useWishlist must be used inside WishlistProvider');
  return value;
}
