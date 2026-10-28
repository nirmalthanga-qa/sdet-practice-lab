import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { authState, refreshAuth } = useAuth();

  const location = useLocation();
  const navigationState: unknown = location.state;

  const requestedPath =
    typeof navigationState === 'object' &&
    navigationState !== null &&
    'returnTo' in navigationState &&
    typeof navigationState.returnTo === 'string'
      ? navigationState.returnTo
      : '';

  const isAllowedReturnPath =
    requestedPath === '/checkout' ||
    requestedPath === '/orders' ||
    /^\/orders\/[a-zA-Z0-9-]+$/.test(requestedPath);

  const returnTo = isAllowedReturnPath ? requestedPath : '/shop';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const submittingRef = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage('Enter your email address and password.');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      if (response.status === 401) {
        setErrorMessage('Email or password is incorrect.');
        return;
      }

      if (response.status === 400) {
        setErrorMessage('Enter a valid email address and password.');
        return;
      }

      if (response.status === 429) {
        setErrorMessage(
          'Too many login attempts. Please try again later.',
        );
        return;
      }

      if (!response.ok) {
        setErrorMessage('We couldn’t sign you in. Please try again.');
        return;
      }

      setPassword('');

      // Confirm the session through /api/auth/me.
      // The authenticated state triggers the redirect below.
      refreshAuth();
    } catch {
      setErrorMessage(
        'Unable to connect. Check your connection and try again.',
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (authState.status === 'authenticated') {
    return <Navigate to={returnTo} replace />;
  }

  if (authState.status === 'loading') {
    return (
      <section
        className="shop-section"
        aria-labelledby="login-loading-title"
      >
        <h1 id="login-loading-title">Sign in</h1>

        <p role="status" aria-atomic="true">
          Checking your sign-in status…
        </p>
      </section>
    );
  }

  return (
    <section
      className="shop-section"
      aria-labelledby="login-title"
    >
      <Link className="back-to-shop" to="/shop">
        ← Back to shop
      </Link>

      <div className="shop-heading">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1 id="login-title">Welcome back.</h1>

        <p className="hero-description">
          Sign in to your practice shopping account.
        </p>

        <p className="sample-data-note">
          Demo application. Use a fictional account and a password
          you don’t use elsewhere.
        </p>
      </div>

      {authState.status === 'error' && (
        <div className="auth-session-error">
          <p role="alert">{authState.message}</p>

          <button
            className="clear-search-button"
            type="button"
            disabled={isSubmitting}
            onClick={refreshAuth}
          >
            Retry session check
          </button>
        </div>
      )}

      <form
        className="checkout-form auth-form"
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
      >
        <div className="checkout-field">
          <label htmlFor="login-email">Email (required)</label>

          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            disabled={isSubmitting}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorMessage('');
            }}
          />
        </div>

        <div className="checkout-field">
          <label htmlFor="login-password">
            Password (required)
          </label>

          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            disabled={isSubmitting}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrorMessage('');
            }}
          />

          <button
            className="clear-search-button"
            type="button"
            aria-controls="login-password"
            disabled={isSubmitting}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? 'Hide password' : 'Show password'}
          </button>
        </div>

        <p
          className="field-error"
          role="alert"
          aria-atomic="true"
        >
          {errorMessage}
        </p>

        <button
          className="primary-link checkout-submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p role="status" aria-atomic="true">
          {isSubmitting ? 'Signing in. Please wait.' : ''}
        </p>

        <p>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </section>
  );
}