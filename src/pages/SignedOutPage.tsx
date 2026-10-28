import { Link, Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export default function SignedOutPage() {
  const { authState, refreshAuth } = useAuth();

  if (authState.status === 'authenticated') {
    return <Navigate to="/shop" replace />;
  }

  return (
    <section
      className="shop-section"
      aria-labelledby="signed-out-title"
    >
      {authState.status === 'loading' ? (
        <>
          <h1 id="signed-out-title">Checking your session…</h1>

          <p role="status" aria-atomic="true">
            Please wait.
          </p>
        </>
      ) : authState.status === 'error' ? (
        <>
          <h1 id="signed-out-title">
            Unable to check your session
          </h1>

          <p role="alert">{authState.message}</p>

          <button
            className="primary-link"
            type="button"
            onClick={refreshAuth}
          >
            Try again
          </button>
        </>
      ) : (
        <>
          <p className="eyebrow">YOUR ACCOUNT</p>

          <h1 id="signed-out-title">You’re signed out.</h1>

          <p className="hero-description">
            Sign in again whenever you’re ready, or return to the
            home page.
          </p>

          <div className="cart-actions">
            <Link className="primary-link" to="/login">
              Sign in again
            </Link>

            <Link className="primary-link" to="/">
              Go to home page
            </Link>
          </div>
        </>
      )}
    </section>
  );
}