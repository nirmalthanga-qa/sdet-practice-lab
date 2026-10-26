import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useCart } from '../hooks/useCart';
import type { Product } from '../types/product';
import { isProduct } from '../utils/isProduct';

type ProductState =
  | { status: 'loading' }
  | { status: 'success'; product: Product }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

function ProductNotFound() {
  return (
    <section
      className="shop-section"
      aria-labelledby="product-not-found-title"
    >
      <h1 id="product-not-found-title">Product not found</h1>

      <p className="hero-description">
        We couldn’t find a product with that ID.
      </p>

      <Link className="primary-link" to="/shop">
        Back to shop
      </Link>
    </section>
  );
}

export default function ProductDetailsPage() {
  const { productId } = useParams();

  if (!productId) {
    return <ProductNotFound />;
  }

  return <ProductDetails key={productId} productId={productId} />;
}

function ProductDetails({ productId }: { productId: string }) {
  const { cartItems, addToCart } = useCart();

  const [productState, setProductState] =
    useState<ProductState>({ status: 'loading' });

  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      try {
        const response = await fetch(
          `/api/products/${encodeURIComponent(productId)}`,
          { signal: controller.signal },
        );

        if (response.status === 404) {
          if (!controller.signal.aborted) {
            setProductState({ status: 'not-found' });
          }

          return;
        }

        if (!response.ok) {
          throw new Error(`Product request failed: ${response.status}`);
        }

        const data: unknown = await response.json();

        if (
          typeof data !== 'object' ||
          data === null ||
          !('product' in data) ||
          !isProduct(data.product) ||
          data.product.id !== productId
        ) {
          throw new Error('Invalid product response');
        }

        if (!controller.signal.aborted) {
          setProductState({
            status: 'success',
            product: data.product,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setProductState({
            status: 'error',
            message:
              'We couldn’t load this product. Please try again.',
          });
        }
      }
    }

    void loadProduct();

    return () => controller.abort();
  }, [productId, requestVersion]);

  function retryLoadingProduct() {
    setProductState({ status: 'loading' });
    setRequestVersion((current) => current + 1);
  }

  if (productState.status === 'loading') {
    return (
      <section
        className="shop-section"
        aria-labelledby="product-loading-title"
      >
        <Link className="back-to-shop" to="/shop">
          ← Back to shop
        </Link>

        <h1 id="product-loading-title">Product details</h1>

        <p role="status" aria-atomic="true">
          Loading product…
        </p>
      </section>
    );
  }

  if (productState.status === 'not-found') {
    return <ProductNotFound />;
  }

  if (productState.status === 'error') {
    return (
      <section
        className="shop-section"
        aria-labelledby="product-error-title"
      >
        <Link className="back-to-shop" to="/shop">
          ← Back to shop
        </Link>

        <h1 id="product-error-title">Unable to load product</h1>

        <p role="alert">{productState.message}</p>

        <button
          className="primary-link"
          type="button"
          onClick={retryLoadingProduct}
        >
          Try again
        </button>
      </section>
    );
  }

  const { product } = productState;

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
            className={`product-stock ${
              isInStock
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