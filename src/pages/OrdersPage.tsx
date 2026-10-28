import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getOrders, OrderApiError } from '../api/orders';
import type { OrderSummary } from '../types/order';
import OrderSpendingChart from '../components/OrderSpendingChart';

type OrdersState =
    | { status: 'loading' }
    | { status: 'success'; orders: OrderSummary[] }
    | {
        status: 'error';
        message: string;
        sessionExpired: boolean;
    };

const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

export default function OrdersPage() {
    const [state, setState] = useState<OrdersState>({
        status: 'loading',
    });
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        async function loadOrders() {
            try {
                const orders = await getOrders(controller.signal);

                if (!controller.signal.aborted) {
                    setState({
                        status: 'success',
                        orders,
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
                    sessionExpired:
                        error instanceof OrderApiError &&
                        error.status === 401,
                });
            }
        }

        void loadOrders();

        return () => controller.abort();
    }, [requestVersion]);

    function retryOrders() {
        setState({ status: 'loading' });
        setRequestVersion((current) => current + 1);
    }

    return (
        <section
            className="shop-section"
            aria-labelledby="orders-title"
        >
            <div className="shop-heading">
                <p className="eyebrow">YOUR ACCOUNT</p>
                <h1 id="orders-title">My orders</h1>

                <p className="hero-description">
                    View your latest 50 practice orders, newest first.
                </p>
            </div>

            {state.status === 'success' && (
                <OrderSpendingChart orders={state.orders} />
            )}

            {state.status === 'loading' && (
                <p role="status" aria-atomic="true">
                    Loading your orders…
                </p>
            )}

            {state.status === 'error' && (
                <div>
                    <p className="field-error" role="alert">
                        {state.message}
                    </p>

                    {state.sessionExpired ? (
                        <Link
                            className="primary-link"
                            to="/login"
                            state={{ returnTo: '/orders' }}
                        >
                            Sign in again
                        </Link>
                    ) : (
                        <button
                            className="primary-link"
                            type="button"
                            onClick={retryOrders}
                        >
                            Retry loading orders
                        </button>
                    )}
                </div>
            )}

            {state.status === 'success' &&
                (state.orders.length === 0 ? (
                    <div className="empty-state">
                        <h2>No orders yet</h2>
                        <p>Your completed practice orders will appear here.</p>
                    </div>
                ) : (
                    <ul className="order-history-list">
                        {state.orders.map((order) => (
                            <li key={order.id}>
                                <article
                                    className="order-history-card"
                                    aria-labelledby={`order-title-${order.id}`}
                                >
                                    <h2 id={`order-title-${order.id}`}>
                                        Order {order.id}
                                    </h2>

                                    <p>
                                        Placed on{' '}
                                        <time dateTime={order.createdAt}>
                                            {dateFormatter.format(
                                                new Date(order.createdAt),
                                            )}
                                        </time>
                                    </p>

                                    <dl className="order-history-facts">
                                        <div>
                                            <dt>Status</dt>
                                            <dd>Confirmed</dd>
                                        </div>

                                        <div>
                                            <dt>Items</dt>
                                            <dd>{order.itemCount}</dd>
                                        </div>

                                        <div>
                                            <dt>Total</dt>
                                            <dd>
                                                {currencyFormatter.format(
                                                    order.totalPaise / 100,
                                                )}
                                            </dd>
                                        </div>
                                    </dl>

                                    <p className="field-help">
                                        Simulated payment — no money charged.
                                    </p>

                                    <Link
                                        className="primary-link"
                                        to={`/orders/${encodeURIComponent(order.id)}`}
                                        aria-label={`View order ${order.id}`}
                                    >
                                        View order
                                    </Link>
                                </article>
                            </li>
                        ))}
                    </ul>
                ))}

            <Link className="back-to-shop" to="/shop">
                Continue shopping
            </Link>
        </section>
    );
}