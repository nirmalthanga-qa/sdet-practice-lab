import type { Product } from '../types/product';
import { useCart } from '../hooks/useCart';

type ProductPurchaseControlsProps = {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export default function ProductPurchaseControls({
  product,
  quantityInCart,
  onAddToCart,
}: ProductPurchaseControlsProps) {
  const {
    catalogueState,
    retryCatalogue,
    canEditCart,
    isCartSaving,
  } = useCart();

  const cartProduct =
    catalogueState.status === 'success'
      ? catalogueState.products.find((item) => item.id === product.id)
      : undefined;

  let buttonLabel: string;
  let stockMessage: string;
  let canAdd = false;

  if (catalogueState.status === 'loading') {
    buttonLabel = 'Checking availability…';
    stockMessage = 'Loading current cart prices and availability.';
  } else if (catalogueState.status === 'error') {
    buttonLabel = 'Availability unavailable';
    stockMessage = catalogueState.message;
  } else if (!cartProduct) {
    buttonLabel = 'Product unavailable';
    stockMessage = 'This product is no longer in the catalogue.';
  } else if (cartProduct.stock === 0) {
    buttonLabel = 'Out of stock';
    stockMessage = 'Out of stock';
  } else if (quantityInCart > cartProduct.stock) {
    buttonLabel = 'Stock limit reached';
    stockMessage =
      `Only ${cartProduct.stock} available · ` +
      `${quantityInCart} in your cart. Reduce the quantity in your cart.`;
  } else if (quantityInCart === cartProduct.stock) {
    buttonLabel = 'Stock limit reached';
    stockMessage =
      `All ${cartProduct.stock} available units are in your cart`;
  } else {
    buttonLabel = 'Add to cart';
    stockMessage =
      `${cartProduct.stock} available · ${quantityInCart} in your cart`;
    canAdd = true;
  }

  const isInStock =
    cartProduct !== undefined && cartProduct.stock > 0;

  const displayedButtonLabel = isCartSaving
    ? 'Saving cart…'
    : buttonLabel;

  return (
    <>
      <p
        className={`product-stock ${
          isInStock
            ? 'product-stock-available'
            : 'product-stock-empty'
        }`}
      >
        {stockMessage}
      </p>

      {cartProduct && (
        <p className="product-price">
          {currencyFormatter.format(cartProduct.pricePaise / 100)}
        </p>
      )}

      <button
        className="add-to-cart-button"
        type="button"
        disabled={!canAdd || !canEditCart}
        aria-label={`${displayedButtonLabel}: ${product.name}`}
        onClick={() => {
          if (canAdd && canEditCart && cartProduct) {
            onAddToCart(cartProduct);
          }
        }}
      >
        {displayedButtonLabel}
      </button>

      {catalogueState.status === 'error' && (
        <button
          className="clear-search-button"
          type="button"
          aria-label={`Retry availability for ${product.name}`}
          onClick={retryCatalogue}
        >
          Retry availability
        </button>
      )}

      <p
        className="product-cart-quantity"
        role="status"
        aria-atomic="true"
      >
        In your cart: {quantityInCart}
      </p>
    </>
  );
}