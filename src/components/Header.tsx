import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const { cartCount } = useCart();
  const { authState, refreshAuth } = useAuth();
  const navigate = useNavigate();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  async function handleLogout() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setLogoutError('');

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.status !== 204) {
        setLogoutError(
          'We couldn’t sign you out. Please try again.',
        );
        return;
      }

      refreshAuth();
      navigate('/signed-out', { replace: true });
    } catch {
      setLogoutError(
        'Unable to connect. Please try signing out again.',
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="site-header">
      <Link
        className="brand"
        to="/"
        aria-label="SDET Practice Lab home"
      >
        <span className="brand-icon" aria-hidden="true">
          {'</>'}
        </span>

        <span className="brand-text">
          <span>SDET Practice Lab</span>
          <span className="brand-credit">by Nirmal Kumar</span>
        </span>
      </Link>

      <nav className="main-navigation" aria-label="Main navigation">
        <NavLink to="/" end>
          Home
        </NavLink>

        <NavLink to="/shop">
          Practice Shop
        </NavLink>

        <NavLink to="/orders">
          My orders
        </NavLink>
      </nav>

      <div className="header-actions">
        <NavLink className="header-cart-count" to="/cart">
          <span aria-hidden="true">🛒</span>
          Cart: {cartCount} {cartCount === 1 ? 'item' : 'items'}
        </NavLink>

        <div className="header-account">
          <span
            className="header-account-status"
            role="status"
            aria-atomic="true"
          >
            {authState.status === 'loading'
              ? 'Checking account…'
              : authState.status === 'authenticated'
                ? `Hi, ${authState.user.fullName}`
                : authState.status === 'error'
                  ? 'Account status unavailable'
                  : ''}
          </span>

          {authState.status === 'anonymous' && (
            <NavLink
              className="primary-link header-auth-control"
              to="/login"
            >
              Sign in
            </NavLink>
          )}

          {authState.status === 'authenticated' && (
            <button
              className="primary-link header-auth-control"
              type="button"
              disabled={isSigningOut}
              onClick={handleLogout}
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          )}

          {authState.status === 'error' && (
            <button
              className="primary-link header-auth-control"
              type="button"
              onClick={() => {
                setLogoutError('');
                refreshAuth();
              }}
            >
              Retry account check
            </button>
          )}

          <p
            className="header-account-error"
            role="alert"
            aria-atomic="true"
          >
            {logoutError}
          </p>
        </div>
      </div>
    </header>
  );
}