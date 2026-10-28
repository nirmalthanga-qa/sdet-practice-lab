import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

type RequireAuthProps = {
  children: ReactNode;
};

export default function RequireAuth({
  children,
}: RequireAuthProps) {
  const { authState, refreshAuth } = useAuth();
  const location = useLocation();

  if (authState.status === 'loading') {
    return (
      <section
        className="shop-section"
        aria-labelledby="auth-loading-title"
      >
        <h1 id="auth-loading-title">Checking your account</h1>

        <p role="status" aria-atomic="true">
          Please wait…
        </p>
      </section>
    );
  }

  if (authState.status === 'error') {
    return (
      <section
        className="shop-section"
        aria-labelledby="auth-error-title"
      >
        <h1 id="auth-error-title">
          Unable to check your account
        </h1>

        <p role="alert">{authState.message}</p>

        <button
          className="primary-link"
          type="button"
          onClick={refreshAuth}
        >
          Try again
        </button>
      </section>
    );
  }

  if (authState.status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname }}
      />
    );
  }

  return children;
}