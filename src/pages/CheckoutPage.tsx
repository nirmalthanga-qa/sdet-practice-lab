import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { OrderApiError, placeOrder } from '../api/orders';
import OrderSummary from '../components/OrderSummary';
import DeliveryReview from '../components/DeliveryReview';
import type { DeliveryDetails } from '../types/delivery';
import type { CheckoutRequest } from '../types/order';
import DeliveryHelp from '../components/DeliveryHelp';

type DeliveryErrors = Partial<Record<keyof DeliveryDetails, string>>;

const initialDetails: DeliveryDetails = {
  fullName: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
};

const fields: {
  name: keyof DeliveryDetails;
  label: string;
  autoComplete: string;
  maxLength: number;
}[] = [
    {
      name: 'fullName',
      label: 'Full name',
      autoComplete: 'name',
      maxLength: 100,
    },
    {
      name: 'email',
      label: 'Delivery contact email',
      autoComplete: 'email',
      maxLength: 254,
    },
    {
      name: 'address',
      label: 'Delivery address',
      autoComplete: 'street-address',
      maxLength: 300,
    },
    {
      name: 'city',
      label: 'City',
      autoComplete: 'address-level2',
      maxLength: 100,
    },
    {
      name: 'postalCode',
      label: 'PIN code',
      autoComplete: 'postal-code',
      maxLength: 6,
    },
  ];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

function validateDetails(details: DeliveryDetails): DeliveryErrors {
  const errors: DeliveryErrors = {};

  for (const field of fields) {
    const value = details[field.name].trim();

    if (!value) {
      errors[field.name] = `Enter your ${field.label.toLowerCase()}.`;
    } else if (value.length > field.maxLength) {
      errors[field.name] =
        `Use ${field.maxLength} characters or fewer.`;
    }
  }

  if (
    details.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())
  ) {
    errors.email = 'Enter an email such as learner@example.com.';
  }

  if (
    details.postalCode.trim() &&
    !/^[1-9][0-9]{5}$/.test(details.postalCode.trim())
  ) {
    errors.postalCode = 'Enter six digits, starting with 1–9.';
  }

  return errors;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSavedCheckout(value: unknown): value is CheckoutRequest {
  if (
    !isRecord(value) ||
    typeof value.checkoutId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      value.checkoutId,
    ) ||
    value.paymentMethod !== 'simulated'
  ) {
    return false;
  }

  const delivery = value.delivery;

  if (
    !isRecord(delivery) ||
    !fields.every(
      (field) => typeof delivery[field.name] === 'string',
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    value.items.length > 100
  ) {
    return false;
  }

  const productIds = new Set<string>();

  for (const item of value.items) {
    if (
      !isRecord(item) ||
      typeof item.productId !== 'string' ||
      item.productId.trim() === '' ||
      typeof item.quantity !== 'number' ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      typeof item.unitPricePaise !== 'number' ||
      !Number.isSafeInteger(item.unitPricePaise) ||
      item.unitPricePaise < 0 ||
      productIds.has(item.productId)
    ) {
      return false;
    }

    productIds.add(item.productId);
  }

  return true;
}

function loadPendingCheckout(storageKey: string): {
  request: CheckoutRequest | null;
  error: string;
} {
  try {
    const saved = sessionStorage.getItem(storageKey);

    if (saved === null) {
      return { request: null, error: '' };
    }

    const parsed: unknown = JSON.parse(saved);

    if (!isSavedCheckout(parsed)) {
      throw new Error('Invalid saved checkout');
    }

    return { request: parsed, error: '' };
  } catch {
    return {
      request: null,
      error:
        'We couldn’t read your saved checkout. No new order has been sent. Keep this tab open while we resolve the saved checkout.',
    };
  }
}

export default function CheckoutPage() {
  const { authState } = useAuth();

  if (authState.status !== 'authenticated') {
    return (
      <section className="shop-section">
        <h1>Checkout</h1>
        <p role="status">Checking your account…</p>
      </section>
    );
  }

  return (
    <CustomerCheckout
      key={authState.user.id}
      userId={authState.user.id}
    />
  );
}

function CustomerCheckout({ userId }: { userId: string }) {
  const {
    cartCount,
    cartProducts,
    catalogueState,
    retryCatalogue,
    canCheckout,
    isCartSaving,
  } = useCart();

  const storageKey = `sdet-checkout-v1:${userId}`;

  const [saved] = useState(() => loadPendingCheckout(storageKey));
  const [pending, setPending] = useState<CheckoutRequest | null>(
    saved.request,
  );

  const [details, setDetails] =
    useState<DeliveryDetails>(initialDetails);
  const [errors, setErrors] = useState<DeliveryErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [review, setReview] = useState<CheckoutRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [canStartAgain, setCanStartAgain] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const submittingRef = useRef(false);

  function updateField(field: keyof DeliveryDetails, value: string) {
    const updated = { ...details, [field]: value };

    setDetails(updated);
    setReview(null);
    setMessage('');

    if (hasSubmitted) {
      setErrors(validateDetails(updated));
    }
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCheckout || submittingRef.current || pending) {
      return;
    }

    const validationErrors = validateDetails(details);

    setErrors(validationErrors);
    setHasSubmitted(true);
    setMessage('');
    setReview(null);

    const firstInvalid = fields.find(
      (field) => validationErrors[field.name],
    );

    if (firstInvalid) {
      const input = event.currentTarget.elements.namedItem(
        firstInvalid.name,
      );

      if (
        input instanceof HTMLInputElement ||
        input instanceof HTMLTextAreaElement
      ) {
        input.focus();
      }

      return;
    }

    setReview({
      checkoutId: crypto.randomUUID(),
      paymentMethod: 'simulated',
      delivery: {
        fullName: details.fullName.trim(),
        email: details.email.trim().toLowerCase(),
        address: details.address.trim(),
        city: details.city.trim(),
        postalCode: details.postalCode.trim(),
      },
      items: cartProducts.map(({ product, quantity }) => ({
        productId: product.id,
        quantity,
        unitPricePaise: product.pricePaise,
      })),
    });
  }

  async function handlePlaceOrder() {
    if (submittingRef.current) {
      return;
    }

    const request = pending ?? review;

    if (!request || (!pending && !canCheckout)) {
      return;
    }

    // Persist before sending. If this fails, no order is submitted.
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(request));
    } catch {
      setMessage(
        'Your browser couldn’t save the checkout for safe retries. No request was sent. Enable session storage and try again.',
      );
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setPending(request);
    setMessage('');
    setCanStartAgain(false);
    setSessionExpired(false);

    try {
      const order = await placeOrder(request);

      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Keeping the same saved request is safe: its ID is idempotent.
      }

      // Reload the app on the receipt page so the shared cart and
      // catalogue are fetched again after the stock/cart changes.
      window.location.replace(
        `/orders/${encodeURIComponent(order.id)}`,
      );
    } catch (error) {
      const rejectedCodes = new Set([
        'VALIDATION_ERROR',
        'CART_EMPTY',
        'CART_CHANGED',
        'PRICE_CHANGED',
        'ITEM_UNAVAILABLE',
        'INSUFFICIENT_STOCK',
        'ORDER_LIMIT_EXCEEDED',
      ]);

      if (error instanceof OrderApiError) {
        setSessionExpired(error.status === 401);

        const definitelyRejected =
          (error.status === 400 || error.status === 409) &&
          rejectedCodes.has(error.code);

        setCanStartAgain(definitelyRejected);

        setMessage(
          definitelyRejected || error.status === 401
            ? error.message
            : `${error.message} Retry this saved checkout to confirm the outcome.`,
        );
      } else {
        setMessage(
          'The connection failed. Your order may already have been saved. Retry this checkout to confirm the outcome.',
        );
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function startAgain() {
    if (!canStartAgain || submittingRef.current) {
      return;
    }

    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      setMessage(
        'We couldn’t clear the rejected checkout. Please try again.',
      );
      return;
    }

    setPending(null);
    setReview(null);
    setMessage('');
    setCanStartAgain(false);
    retryCatalogue();
  }

  if (saved.error) {
    return (
      <section className="shop-section">
        <h1>Checkout needs attention</h1>
        <p role="alert">{saved.error}</p>
      </section>
    );
  }

  // Pending requests remain recoverable even if an earlier successful
  // request emptied the cart before its response reached the browser.
  if (!pending) {
    if (catalogueState.status === 'loading' || isCartSaving) {
      return (
        <section className="shop-section">
          <h1>Preparing checkout</h1>
          <p role="status">
            Loading the latest cart prices and availability…
          </p>
        </section>
      );
    }

    if (catalogueState.status === 'error') {
      return (
        <section className="shop-section">
          <h1>Unable to load checkout</h1>
          <p role="alert">{catalogueState.message}</p>
          <button
            className="primary-link"
            type="button"
            onClick={retryCatalogue}
          >
            Reload cart
          </button>
        </section>
      );
    }

    if (cartCount === 0 || !canCheckout) {
      return (
        <section className="shop-section">
          <h1>
            {cartCount === 0
              ? 'Your cart is empty'
              : 'Your cart needs attention'}
          </h1>
          <p>
            Review your cart before continuing to checkout.
          </p>
          <Link className="primary-link" to="/cart">
            Review cart
          </Link>
        </section>
      );
    }
  }

  const checkout = pending ?? review;

  return (
    <section
      className="shop-section"
      aria-labelledby="checkout-title"
    >
      <div className="shop-heading">
        <p className="eyebrow">CHECKOUT</p>
        <h1 id="checkout-title">Complete your practice order.</h1>
        <p className="hero-description">
          Use fictional delivery details. Payment is simulated;
          no money will be charged.
        </p>
      </div>

      {!pending && (
        <div className="checkout-layout">
          <form
            className="checkout-form"
            onSubmit={handleReview}
            noValidate
          >
            {fields.map((field) => {
              const errorId = `${field.name}-error`;
              const helpId = `${field.name}-help`;
              const hasHelp =
                field.name === 'email' ||
                field.name === 'postalCode';

              const describedBy = [
                hasHelp ? helpId : '',
                errors[field.name] ? errorId : '',
              ]
                .filter(Boolean)
                .join(' ') || undefined;

              const commonProps = {
                id: field.name,
                name: field.name,
                autoComplete: field.autoComplete,
                required: true,
                maxLength: field.maxLength,
                value: details[field.name],
                'aria-invalid': Boolean(errors[field.name]),
                'aria-describedby': describedBy,
              };

              return (
                <div className="checkout-field" key={field.name}>
                  <label htmlFor={field.name}>
                    {field.label} (required)
                  </label>

                  {field.name === 'address' ? (
                    <textarea
                      {...commonProps}
                      rows={3}
                      onChange={(event) =>
                        updateField(field.name, event.target.value)
                      }
                    />
                  ) : (
                    <input
                      {...commonProps}
                      type={field.name === 'email' ? 'email' : 'text'}
                      inputMode={
                        field.name === 'postalCode'
                          ? 'numeric'
                          : undefined
                      }
                      onChange={(event) =>
                        updateField(field.name, event.target.value)
                      }
                    />
                  )}

                  {hasHelp && (
                    <p id={helpId} className="field-help">
                      {field.name === 'email'
                        ? 'This can differ from your account email.'
                        : 'Enter six digits starting with 1–9. This checks the format, not delivery availability.'}
                    </p>
                  )}

                  {errors[field.name] && (
                    <p id={errorId} className="field-error">
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              );
            })}

            <button
              className="primary-link checkout-submit"
              type="submit"
              disabled={!canCheckout}
            >
              Review order
            </button>

            <p role="status">
              {review
                ? 'Your order is ready to review below. No order has been placed yet.'
                : ''}
            </p>
          </form>

          <div>
            <OrderSummary />
            <DeliveryHelp />
          </div>
        </div>
      )}

      {checkout && (
        <section aria-labelledby="checkout-review-title">
          <h2 id="checkout-review-title">
            {pending ? 'Saved checkout' : 'Review before placing your order'}
          </h2>

          {pending && (
            <p>
              This request is saved in this browser tab. Retrying uses
              the same checkout ID to avoid creating a duplicate order.
            </p>
          )}

          <DeliveryReview details={checkout.delivery} />

          <ul className="order-summary-items">
            {checkout.items.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.productId} × {item.quantity}
                </span>
                <strong>
                  {currencyFormatter.format(
                    (item.unitPricePaise * item.quantity) / 100,
                  )}
                </strong>
              </li>
            ))}
          </ul>

          <p className="order-summary-total">
            <span>Total</span>
            <strong>
              {currencyFormatter.format(
                checkout.items.reduce(
                  (total, item) =>
                    total + item.unitPricePaise * item.quantity,
                  0,
                ) / 100,
              )}
            </strong>
          </p>

          <div className="cart-actions">
            {!canStartAgain && !sessionExpired && (
              <button
                className="primary-link checkout-submit"
                type="button"
                disabled={isSubmitting}
                onClick={() => void handlePlaceOrder()}
              >
                {isSubmitting
                  ? 'Confirming order…'
                  : pending
                    ? 'Retry saved checkout'
                    : 'Place practice order'}
              </button>
            )}

            {canStartAgain && (
              <button
                className="primary-link"
                type="button"
                onClick={startAgain}
              >
                Reload cart and review again
              </button>
            )}

            {sessionExpired && (
              <Link
                className="primary-link"
                to="/login"
                state={{ returnTo: '/checkout' }}
              >
                Sign in again
              </Link>
            )}
          </div>
        </section>
      )}

      <p role="status" aria-atomic="true">
        {isSubmitting ? 'Confirming your order. Please wait.' : ''}
      </p>

      <p className="field-error" role="alert" aria-atomic="true">
        {message}
      </p>
    </section>
  );
}