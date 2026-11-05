import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useWishlist } from '../hooks/useWishlist';

function SuccessNotification({ text, onDismiss }: {
  text: string;
  onDismiss: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // Give someone reading or using the close button time to finish.
    if (hovered || focused) return;
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [hovered, focused, onDismiss]);

  return (
    <div className="wishlist-toast"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}>
      <p>{text}</p>
      <button className="wishlist-toast-close" type="button"
        aria-label="Dismiss wishlist notification"
        onClick={() => {
          // Do not leave keyboard focus on a button that is about to disappear.
          document.getElementById('main-content')?.focus({ preventScroll: true });
          onDismiss();
        }}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export default function WishlistStatus() {
  const { authState, refreshAuth } = useAuth();
  const { busy, error, notification, dismissNotification, reload } = useWishlist();
  const location = useLocation();
  const visible = notification?.routeKey === location.key;

  // Clear the provider value on navigation so returning cannot replay an old toast.
  useEffect(() => {
    if (notification && notification.routeKey !== location.key) dismissNotification();
  }, [notification, location.key, dismissNotification]);

  if (authState.status !== 'authenticated') return null;
  return (
    <>
      <div className="wishlist-live-status" role="status" aria-atomic="true">
        {busy ? 'Updating wishlist…' : ''}
      </div>
      <div className="wishlist-toast-region" role="status" aria-live="polite" aria-atomic="true">
        {notification && visible && (
          <SuccessNotification key={notification.id} text={notification.text} onDismiss={dismissNotification} />
        )}
      </div>
      {error && (
        <div className="wishlist-feedback">
          <p className="field-error" role="alert">{error}</p>
          <button className="clear-search-button" type="button" disabled={busy} onClick={reload}>Reload wishlist</button>{' '}
          <button className="clear-search-button" type="button" disabled={busy} onClick={refreshAuth}>Check sign-in</button>
        </div>
      )}
    </>
  );
}
