import { createContext } from 'react';
import type { Wishlist } from '../api/wishlist';
export type WishlistContextValue = {
  list: Wishlist | null;
  busy: boolean;
  error: string;
  notification: { id: number; text: string; routeKey: string } | null;
  dismissNotification: () => void;
  canEdit: boolean;
  reload: () => void;
  save: (id: string, remove?: boolean) => Promise<boolean>;
  reorder: (ids: string[]) => Promise<boolean>;
};
export const WishlistContext = createContext<WishlistContextValue | null>(null);
