import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { useCart } from '../hooks/useCart';
import OrderSummary from '../components/OrderSummary';
import DeliveryReview from '../components/DeliveryReview';
import type { DeliveryDetails } from '../types/delivery';

type DeliveryErrors = Partial<Record<keyof DeliveryDetails, string>>;

const initialDetails: DeliveryDetails = {
  fullName: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
};

const fieldOrder: (keyof DeliveryDetails)[] = [
  'fullName',
  'email',
  'address',
  'city',
  'postalCode',
];

function validateDetails(details: DeliveryDetails): DeliveryErrors {
  const errors: DeliveryErrors = {};

  if (!details.fullName.trim()) {
    errors.fullName = 'Enter your full name.';
  }

  if (!details.email.trim()) {
    errors.email = 'Enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) {
    errors.email = 'Enter an email address such as learner@example.com.';
  }

  if (!details.address.trim()) {
    errors.address = 'Enter your delivery address.';
  }

  if (!details.city.trim()) {
    errors.city = 'Enter your city.';
  }

  if (!details.postalCode.trim()) {
    errors.postalCode = 'Enter your PIN code.';
  } else if (!/^[1-9][0-9]{5}$/.test(details.postalCode.trim())) {
    errors.postalCode = 'Enter six digits, starting with 1–9.';
  }

  return errors;
}

export default function CheckoutPage() {
  const {
    cartCount,
    catalogueState,
    retryCatalogue,
    canCheckout,
  } = useCart();

  if (cartCount === 0) {
    return (
      <section
        className="shop-section"
        aria-labelledby="empty-checkout-title"
      >
        <h1 id="empty-checkout-title">Your cart is empty</h1>

        <p className="hero-description">
          Add a product before starting checkout.
        </p>

        <Link className="primary-link" to="/shop">
          Explore the shop
        </Link>
      </section>
    );
  }

  if (catalogueState.status === 'loading') {
    return (
      <section
        className="shop-section"
        aria-labelledby="checkout-loading-title"
      >
        <Link className="back-to-shop" to="/cart">
          ← Back to cart
        </Link>

        <h1 id="checkout-loading-title">Preparing checkout</h1>

        <p role="status" aria-atomic="true">
          Loading cart prices and availability…
        </p>
      </section>
    );
  }

  if (catalogueState.status === 'error') {
    return (
      <section
        className="shop-section"
        aria-labelledby="checkout-error-title"
      >
        <Link className="back-to-shop" to="/cart">
          ← Back to cart
        </Link>

        <h1 id="checkout-error-title">Unable to load checkout</h1>

        <p role="alert">{catalogueState.message}</p>

        <p>Your saved cart items have been kept.</p>

        <button
          className="primary-link"
          type="button"
          onClick={retryCatalogue}
        >
          Try again
        </button>
      </section>
    );
  }

  if (!canCheckout) {
    return (
      <section
        className="shop-section"
        aria-labelledby="checkout-blocked-title"
      >
        <h1 id="checkout-blocked-title">Your cart needs attention</h1>

        <p role="alert">
          Some products are unavailable or exceed current stock.
          Update your cart before continuing.
        </p>

        <Link className="primary-link" to="/cart">
          Review your cart
        </Link>
      </section>
    );
  }

  return <CheckoutForm />;
}

function CheckoutForm() {
  const { canCheckout } = useCart();

  const [details, setDetails] =
    useState<DeliveryDetails>(initialDetails);
  const [errors, setErrors] = useState<DeliveryErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [reviewedDetails, setReviewedDetails] =
    useState<DeliveryDetails | null>(null);

  function updateField(field: keyof DeliveryDetails, value: string) {
    const updatedDetails = {
      ...details,
      [field]: value,
    };

    setDetails(updatedDetails);
    setMessage('');
    setReviewedDetails(null);

    if (hasSubmitted) {
      setErrors(validateDetails(updatedDetails));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage('');
    setReviewedDetails(null);

    if (!canCheckout) {
      return;
    }

    const form = event.currentTarget;
    const validationErrors = validateDetails(details);

    setErrors(validationErrors);
    setHasSubmitted(true);

    const firstInvalidField = fieldOrder.find(
      (field) => validationErrors[field],
    );

    if (firstInvalidField) {
      const input = form.elements.namedItem(firstInvalidField);

      if (
        input instanceof HTMLInputElement ||
        input instanceof HTMLTextAreaElement
      ) {
        input.focus();
      }

      return;
    }

    setReviewedDetails({
      fullName: details.fullName.trim(),
      email: details.email.trim(),
      address: details.address.trim(),
      city: details.city.trim(),
      postalCode: details.postalCode.trim(),
    });

    setMessage(
      'Delivery details validated. No order has been placed yet.',
    );
  }

  return (
    <section
      className="shop-section"
      aria-labelledby="checkout-title"
    >
      <Link className="back-to-shop" to="/cart">
        ← Back to cart
      </Link>

      <div className="shop-heading">
        <p className="eyebrow">CHECKOUT · DELIVERY</p>
        <h1 id="checkout-title">Where should it go?</h1>

        <p className="hero-description">
          Practise completing a delivery form. Use fictional details.
        </p>
      </div>

      <div className="checkout-layout">
        <form
          className="checkout-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="checkout-field">
            <label htmlFor="full-name">Full name (required)</label>

            <input
              id="full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              value={details.fullName}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={
                errors.fullName ? 'full-name-error' : undefined
              }
              onChange={(event) =>
                updateField('fullName', event.target.value)
              }
            />

            {errors.fullName && (
              <p id="full-name-error" className="field-error">
                {errors.fullName}
              </p>
            )}
          </div>

          <div className="checkout-field">
            <label htmlFor="email">Email (required)</label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={details.email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? 'email-error' : undefined
              }
              onChange={(event) =>
                updateField('email', event.target.value)
              }
            />

            {errors.email && (
              <p id="email-error" className="field-error">
                {errors.email}
              </p>
            )}
          </div>

          <div className="checkout-field">
            <label htmlFor="address">Delivery address (required)</label>

            <textarea
              id="address"
              name="address"
              autoComplete="street-address"
              required
              rows={3}
              maxLength={300}
              value={details.address}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={
                errors.address ? 'address-error' : undefined
              }
              onChange={(event) =>
                updateField('address', event.target.value)
              }
            />

            {errors.address && (
              <p id="address-error" className="field-error">
                {errors.address}
              </p>
            )}
          </div>

          <div className="checkout-field">
            <label htmlFor="city">City (required)</label>

            <input
              id="city"
              name="city"
              type="text"
              autoComplete="address-level2"
              required
              maxLength={100}
              value={details.city}
              aria-invalid={Boolean(errors.city)}
              aria-describedby={
                errors.city ? 'city-error' : undefined
              }
              onChange={(event) =>
                updateField('city', event.target.value)
              }
            />

            {errors.city && (
              <p id="city-error" className="field-error">
                {errors.city}
              </p>
            )}
          </div>

          <div className="checkout-field">
            <label htmlFor="postal-code">PIN code (required)</label>

            <input
              id="postal-code"
              name="postalCode"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              required
              maxLength={6}
              value={details.postalCode}
              aria-invalid={Boolean(errors.postalCode)}
              aria-describedby={
                errors.postalCode
                  ? 'postal-code-help postal-code-error'
                  : 'postal-code-help'
              }
              onChange={(event) =>
                updateField('postalCode', event.target.value)
              }
            />

            <p id="postal-code-help" className="field-help">
              Enter a six-digit Indian PIN code starting with 1–9.
              This checks the format, not delivery availability.
            </p>

            {errors.postalCode && (
              <p id="postal-code-error" className="field-error">
                {errors.postalCode}
              </p>
            )}
          </div>

          <button
            className="primary-link checkout-submit"
            type="submit"
            disabled={!canCheckout}
          >
            Validate delivery details
          </button>

          <p
            className="checkout-message"
            role="status"
            aria-atomic="true"
          >
            {message}
          </p>

          {reviewedDetails && (
            <DeliveryReview details={reviewedDetails} />
          )}
        </form>

        <OrderSummary />
      </div>
    </section>
  );
}