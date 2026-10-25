import type { Product } from '../types/product';
import { Link } from 'react-router';

type ProductCardProps = {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export default function ProductCard({
  product,
  quantityInCart,
  onAddToCart,
}: ProductCardProps) {
  const isInStock = product.stock > 0;
  const reachedStockLimit = quantityInCart >= product.stock;

  const buttonLabel = !isInStock
    ? 'Out of stock'
    : reachedStockLimit
      ? 'Stock limit reached'
      : 'Add to cart';

  return (
    <article
      className="product-card"
      aria-labelledby={`product-title-${product.id}`}
    >
      <div className="product-visual">
        <span aria-hidden="true">{product.icon}</span>
      </div>

      <div className="product-content">
        <p className="product-category">{product.category}</p>

        <h2 id={`product-title-${product.id}`}>
          <Link
            className="product-title-link"
            to={`/shop/${product.id}`}
          >
            {product.name}
          </Link>
        </h2>

        <p className="product-description">{product.description}</p>

        <p
          className={`product-stock ${isInStock ? 'product-stock-available' : 'product-stock-empty'
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

        <button
          className="add-to-cart-button"
          type="button"
          disabled={!isInStock || reachedStockLimit}
          aria-label={`${buttonLabel}: ${product.name}`}
          onClick={() => onAddToCart(product)}
        >
          {buttonLabel}
        </button>

        <p className="product-cart-quantity">
          In your cart: {quantityInCart}
        </p>
      </div>
    </article>
  );
}