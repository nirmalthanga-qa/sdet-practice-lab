import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const { authState } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Enter your full name.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (response.status === 409) {
        setErrorMessage(
          'An account with this email already exists. Please sign in.',
        );
        return;
      }

      if (response.status === 400) {
        setErrorMessage(
          'Check your name and email. Your password must contain 8–128 characters.',
        );
        return;
      }

      if (response.status === 429) {
        setErrorMessage(
          'Too many registration attempts. Please try again later.',
        );
        return;
      }

      if (response.status !== 201) {
        setErrorMessage(
          'We couldn’t create your account. Please try again.',
        );
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setIsRegistered(true);
    } catch {
      setErrorMessage(
        'Unable to connect. Check your connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authState.status === 'authenticated') {
    return <Navigate to="/shop" replace />;
  }

  if (authState.status === 'loading') {
    return (
      <section
        className="shop-section"
        aria-labelledby="register-loading-title"
      >
        <h1 id="register-loading-title">Create an account</h1>

        <p role="status">Checking your sign-in status…</p>
      </section>
    );
  }

  if (isRegistered) {
    return (
      <section
        className="shop-section"
        aria-labelledby="registration-success-title"
      >
        <h1 id="registration-success-title">Your account is ready.</h1>

        <p role="status">
          Registration successful. Sign in to continue.
        </p>

        <Link className="primary-link" to="/login">
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section
      className="shop-section"
      aria-labelledby="register-title"
    >
      <Link className="back-to-shop" to="/shop">
        ← Back to shop
      </Link>

      <div className="shop-heading">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1 id="register-title">Create your account.</h1>

        <p className="hero-description">
          Join the practice shop and explore the customer experience.
        </p>

        <p className="sample-data-note">
          Use fictional details and a password you don’t use elsewhere.
        </p>
      </div>

      <form
        className="checkout-form auth-form"
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
      >
        <div className="checkout-field">
          <label htmlFor="register-name">Full name (required)</label>

          <input
            id="register-name"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            maxLength={100}
            value={fullName}
            disabled={isSubmitting}
            onChange={(event) => {
              setFullName(event.target.value);
              setErrorMessage('');
            }}
          />
        </div>

        <div className="checkout-field">
          <label htmlFor="register-email">Email (required)</label>

          <input
            id="register-email"
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
          <label htmlFor="register-password">Password (required)</label>

          <input
            id="register-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            aria-describedby="register-password-help"
            value={password}
            disabled={isSubmitting}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrorMessage('');
            }}
          />

          <p id="register-password-help" className="field-help">
            Use 8–128 characters. Spaces are allowed.
          </p>
        </div>

        <div className="checkout-field">
          <label htmlFor="register-confirm-password">
            Confirm password (required)
          </label>

          <input
            id="register-confirm-password"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={confirmPassword}
            disabled={isSubmitting}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setErrorMessage('');
            }}
          />

          <button
            className="clear-search-button"
            type="button"
            aria-controls="register-password register-confirm-password"
            disabled={isSubmitting}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? 'Hide passwords' : 'Show passwords'}
          </button>
        </div>

        <p className="field-error" role="alert" aria-atomic="true">
          {errorMessage}
        </p>

        <button
          className="primary-link checkout-submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <p role="status" aria-atomic="true">
          {isSubmitting ? 'Creating your account. Please wait.' : ''}
        </p>

        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </section>
  );
}