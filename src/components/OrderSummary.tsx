import { Link } from 'react-router';
import { useCart } from '../hooks/useCart';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export default function OrderSummary() {
  const { cartProducts, cartCount } = useCart();

  const subtotalPaise = cartProducts.reduce(
    (total, item) => total + item.product.pricePaise * item.quantity,
    0,
  );

  return (
    <aside
      className="order-summary"
      aria-labelledby="order-summary-title"
    >
      <h2 id="order-summary-title">Order summary</h2>

      <p className="order-summary-count">
        {cartCount} {cartCount === 1 ? 'item' : 'items'}
      </p>

      <ul className="order-summary-items">
        {cartProducts.map(({ product, quantity }) => (
          <li key={product.id}>
            <div>
              <h3>{product.name}</h3>

              <p>
                {currencyFormatter.format(product.pricePaise / 100)}
                {' × '}
                {quantity}
              </p>
            </div>

            <strong>
              {currencyFormatter.format(
                (product.pricePaise * quantity) / 100,
              )}
            </strong>
          </li>
        ))}
      </ul>

      <div className="order-summary-total">
        <span>Product subtotal</span>
        <strong>
          {currencyFormatter.format(subtotalPaise / 100)}
        </strong>
      </div>

      <p className="field-help">
        Delivery charges and any additional taxes are not calculated
        in this practice step.
      </p>

      <Link className="order-summary-edit" to="/cart">
        Edit your cart
      </Link>
    </aside>
  );
}