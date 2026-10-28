import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getOrder, OrderApiError } from '../api/orders';
import type { Order } from '../types/order';

type OrderState =
  | { status: 'loading' }
  | { status: 'success'; order: Order }
  | {
    status: 'error';
    message: string;
    httpStatus: number | null;
  };

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function OrderDetailsPage() {
  const { orderId } = useParams();

  if (!orderId) {
    return (
      <section className="shop-section">
        <h1>Order not found</h1>

        <Link className="primary-link" to="/shop">
          Back to shop
        </Link>
      </section>
    );
  }

  return <OrderDetails key={orderId} orderId={orderId} />;
}

function OrderDetails({ orderId }: { orderId: string }) {
  const [state, setState] = useState<OrderState>({
    status: 'loading',
  });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrder() {
      try {
        const order = await getOrder(orderId, controller.signal);

        if (!controller.signal.aborted) {
          setState({
            status: 'success',
            order,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: 'error',
          message:
            error instanceof OrderApiError
              ? error.message
              : 'We couldn’t connect. Please try again.',
          httpStatus:
            error instanceof OrderApiError ? error.status : null,
        });
      }
    }

    void loadOrder();

    return () => controller.abort();
  }, [orderId, requestVersion]);

  function retryOrder() {
    setState({ status: 'loading' });
    setRequestVersion((current) => current + 1);
  }

  if (state.status === 'loading') {
    return (
      <section
        className="shop-section"
        aria-labelledby="order-loading-title"
      >
        <h1 id="order-loading-title">Your order</h1>

        <p role="status" aria-atomic="true">
          Loading your order…
        </p>
      </section>
    );
  }

  if (state.status === 'error') {
    const isNotFound = state.httpStatus === 404;
    const isUnauthenticated = state.httpStatus === 401;

    return (
      <section
        className="shop-section"
        aria-labelledby="order-error-title"
      >
        <h1 id="order-error-title">
          {isNotFound
            ? 'Order not found'
            : isUnauthenticated
              ? 'Please sign in'
              : 'Unable to load your order'}
        </h1>

        <p className="field-error" role="alert">
          {state.message}
        </p>

        <div className="cart-actions">
          {!isNotFound && !isUnauthenticated && (
            <button
              className="primary-link"
              type="button"
              onClick={retryOrder}
            >
              Retry loading order
            </button>
          )}

          {isUnauthenticated && (
            <Link
              className="primary-link"
              to="/login"
              state={{ returnTo: `/orders/${orderId}` }}
            >
              Sign in
            </Link>
          )}

          <Link className="back-to-shop" to="/shop">
            Back to shop
          </Link>
        </div>
      </section>
    );
  }

  const { order } = state;

  const itemCount = order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <section
      className="shop-section"
      aria-labelledby="order-details-title"
    >
      <Link className="back-to-shop" to="/shop">
        ← Back to shop
      </Link>

      <div className="shop-heading">
        <p className="eyebrow">YOUR ORDER</p>

        <h1 id="order-details-title">Order confirmed.</h1>

        <p className="hero-description">
          Your practice order has been saved.
        </p>

        <p className="sample-data-note">
          Simulated payment only. No money has been charged.
        </p>
      </div>

      <div className="checkout-layout">
        <div>
          <section aria-labelledby="order-information-title">
            <h2 id="order-information-title">Order information</h2>

            <dl>
              <dt>Order ID</dt>
              <dd>{order.id}</dd>

              <dt>Placed on</dt>
              <dd>
                <time dateTime={order.createdAt}>
                  {dateFormatter.format(new Date(order.createdAt))}
                </time>
              </dd>

              <dt>Status</dt>
              <dd>Confirmed</dd>

              <dt>Payment</dt>
              <dd>Simulated payment completed</dd>
            </dl>
          </section>

          <section aria-labelledby="order-delivery-title">
            <h2 id="order-delivery-title">Delivery details</h2>

            <dl>
              <dt>Recipient</dt>
              <dd>{order.delivery.fullName}</dd>

              <dt>Delivery contact email</dt>
              <dd>{order.delivery.email}</dd>

              <dt>Address</dt>
              <dd style={{ whiteSpace: 'pre-line' }}>
                {order.delivery.address}
              </dd>

              <dt>City</dt>
              <dd>{order.delivery.city}</dd>

              <dt>PIN code</dt>
              <dd>{order.delivery.postalCode}</dd>
            </dl>
          </section>
        </div>

        <aside
          className="order-summary"
          aria-labelledby="placed-order-summary-title"
        >
          <h2 id="placed-order-summary-title">Purchased items</h2>

          <p className="order-summary-count">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>

          <ul className="order-summary-items">
            {order.items.map((item) => (
              <li key={item.productId}>
                <div>
                  <h3>{item.productName}</h3>

                  <p>
                    {currencyFormatter.format(
                      item.unitPricePaise / 100,
                    )}
                    {' × '}
                    {item.quantity}
                  </p>
                </div>

                <strong>
                  {currencyFormatter.format(
                    item.lineTotalPaise / 100,
                  )}
                </strong>
              </li>
            ))}
          </ul>

          <div className="order-summary-total">
            <span>Total</span>

            <strong>
              {currencyFormatter.format(order.totalPaise / 100)}
            </strong>
          </div>

          <p className="field-help">
            No additional delivery charges or taxes were added
            to this practice order.
          </p>
        </aside>
      </div>

      <div className="cart-actions">
        <Link className="primary-link" to="/orders">
          My orders
        </Link>

        <Link className="primary-link" to="/shop">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}