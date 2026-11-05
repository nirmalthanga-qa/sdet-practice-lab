import { useLocation } from 'react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { requestWishlist } from '../api/wishlist';
import type { Wishlist } from '../api/wishlist';
import { WishlistContext } from './WishlistContext';
import type { WishlistContextValue } from './WishlistContext';

export default function WishlistProvider({ children }: { children: ReactNode }) {
  const { authState } = useAuth();
  const userId = authState.status === 'authenticated' ? authState.user.id : '';
  return <AccountWishlist key={userId} active={Boolean(userId)}>{children}</AccountWishlist>;
}
function AccountWishlist({ active, children }: { active: boolean; children: ReactNode }) {
  const [list, setList] = useState<Wishlist | null>(null);
  const [busy, setBusy] = useState(active);
  const [error, setError] = useState('');
  const { key: routeKey } = useLocation();
  const [notification, setNotification] = useState<WishlistContextValue['notification']>(null);
  const notificationId = useRef(0);
  const dismissNotification = useCallback(() => setNotification(null), []);
  const [revision, setRevision] = useState(0);
  const busyRef = useRef(active);
  const mutationRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void requestWishlist('', 'GET', undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) { setList(data); setError(''); }
    }).catch(() => {
      if (!controller.signal.aborted) setError('Could not load your wishlist. Reload it or sign in again.');
    }).finally(() => {
      if (!controller.signal.aborted) { busyRef.current = false; setBusy(false); }
    });
    return () => controller.abort();
  }, [active, revision]);
  useEffect(() => () => mutationRef.current?.abort(), []);
  function reload() {
    if (!active || busyRef.current) return;
    busyRef.current = true; setBusy(true); setNotification(null);
    setRevision(value => value + 1);
  }
  async function change(path: string, method: string, extra: object, success: string) {
    if (!active || !list || busyRef.current || error) return false;
    busyRef.current = true; setBusy(true); setNotification(null);
    const controller = new AbortController(); mutationRef.current = controller;
    try {
      const data = await requestWishlist(path, method, { expectedVersion: list.version, ...extra }, controller.signal);
      if (controller.signal.aborted) return false;
      setList(data); setNotification({ id: ++notificationId.current, text: success, routeKey }); return true;
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not confirm the change. Reload your wishlist.');
      return false;
    } finally {
      if (!controller.signal.aborted) { busyRef.current = false; setBusy(false); }
    }
  }
  return <WishlistContext.Provider value={{ list, busy, error, notification, dismissNotification,
    canEdit: active && list !== null && !busy && !error,
    reload,
    save: (id, remove = false) => change(`/items/${encodeURIComponent(id)}`, remove ? 'DELETE' : 'PUT', {}, remove ? 'Product removed from wishlist.' : 'Product saved to wishlist.'),
    reorder: ids => change('/order', 'PUT', { productIds: ids }, 'Wishlist order saved.'),
  }}>{children}</WishlistContext.Provider>;
}
