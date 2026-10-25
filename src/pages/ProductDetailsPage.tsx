import { Link, useParams } from 'react-router';
import { products } from '../data/products';
import { useCart } from '../hooks/useCart';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export default function ProductDetailsPage() {
  const { productId } = useParams();
  const { cartItems, addToCart } = useCart();

  const product = products.find((item) => item.id === productId);

  if (!product) {
    return (
      <section className="shop-section">
        <h1>Product not found</h1>

        <p className="hero-description">
          We couldn’t find a product with that ID.
        </p>

        <Link className="primary-link" to="/shop">
          Back to shop
        </Link>
      </section>
    );
  }

  const quantityInCart =
    cartItems.find((item) => item.productId === product.id)?.quantity ?? 0;

  const isInStock = product.stock > 0;
  const reachedStockLimit = quantityInCart >= product.stock;

  const buttonLabel = !isInStock
    ? 'Out of stock'
    : reachedStockLimit
      ? 'Stock limit reached'
      : 'Add to cart';

  return (
    <section
      className="shop-section"
      aria-labelledby="product-details-title"
    >
      <Link className="back-to-shop" to="/shop">
        ← Back to shop
      </Link>

      <div className="product-details">
        <div className="product-details-visual" aria-hidden="true">
          {product.icon}
        </div>

        <div className="product-details-content">
          <p className="product-category">{product.category}</p>

          <h1 id="product-details-title">{product.name}</h1>

          <p className="product-description">{product.description}</p>

          <p
            className={`product-stock ${isInStock
                ? 'product-stock-available'
                : 'product-stock-empty'
              }`}
          >
            {!isInStock
              ? 'Out of stock'
              : reachedStockLimit
                ? `All ${product.stock} available units are in your cart`
                : `${product.stock} available · ${quantityInCart} in your cart`}

          </p>

          <p className="product-price">
            {currencyFormatter.format(product.pricePaise / 100)}
          </p>

          <p className="sample-data-note">
            Product ID: {product.id}
          </p>

          <button
            className="add-to-cart-button"
            type="button"
            disabled={!isInStock || reachedStockLimit}
            aria-label={`${buttonLabel}: ${product.name}`}
            onClick={() => addToCart(product)}
          >
            {buttonLabel}
          </button>

          <p
            className="product-cart-quantity"
            role="status"
            aria-atomic="true"
          >
            In your cart: {quantityInCart}
          </p>

          <Link className="primary-link" to="/shop">
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}