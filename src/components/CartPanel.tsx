import { useRef } from 'react';
import { Link } from 'react-router';
import type { Product } from '../types/product';
import { useCart } from '../hooks/useCart';

type CartPanelProps = {
  items: {
    product: Product;
    quantity: number;
  }[];
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export default function CartPanel({
  items,
  onQuantityChange,
  onRemove,
  onClear,
}: CartPanelProps) {
  const {
    cartItems,
    catalogueState,
    retryCatalogue,
    unavailableItems,
    hasCartIssues,
    canCheckout,
  } = useCart();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const isEmpty = cartItems.length === 0;
  const isReady = catalogueState.status === 'success';

  const subtotalPaise = items.reduce(
    (total, item) => total + item.product.pricePaise * item.quantity,
    0,
  );

  function confirmClearCart() {
    dialogRef.current?.close();
    onClear();
    headingRef.current?.focus();
  }

  return (
    <section
      id="cart-panel"
      className="cart-panel"
      aria-labelledby="cart-title"
    >
      <h2 id="cart-title" ref={headingRef} tabIndex={-1}>
        Your cart
      </h2>

      {isEmpty ? (
        <p>Your cart is empty. Add a product to get started.</p>
      ) : (
        <>
          <p role="status" aria-atomic="true">
            {catalogueState.status === 'loading'
              ? 'Loading cart prices and availability…'
              : ''}
          </p>

          {catalogueState.status === 'error' && (
            <div className="empty-state">
              <p role="alert">{catalogueState.message}</p>

              <p>Your saved cart items have been kept.</p>

              <button
                className="primary-link"
                type="button"
                onClick={retryCatalogue}
              >
                Try again
              </button>
            </div>
          )}

          {isReady && (
            <>
              {hasCartIssues && (
                <p role="alert">
                  Some items are unavailable or exceed current stock.
                  Update your cart before checkout.
                </p>
              )}

              <ul className="cart-items">
                {items.map(({ product, quantity }) => {
                  const exceedsStock = quantity > product.stock;

                  return (
                    <li className="cart-item" key={product.id}>
                      <div>
                        <h3>{product.name}</h3>

                        <p>
                          {currencyFormatter.format(
                            product.pricePaise / 100,
                          )}{' '}
                          each
                        </p>

                        {exceedsStock && (
                          <p className="field-error">
                            {product.stock === 0
                              ? 'This product is out of stock. Remove it to continue.'
                              : `Only ${product.stock} available. Reduce your quantity to ${product.stock} or fewer.`}
                          </p>
                        )}

                        <div
                          className="cart-quantity-controls"
                          role="group"
                          aria-label={`Quantity for ${product.name}`}
                        >
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${product.name}`}
                            disabled={
                              quantity <= 1 || product.stock === 0
                            }
                            onClick={() =>
                              onQuantityChange(
                                product.id,
                                quantity - 1,
                              )
                            }
                          >
                            −
                          </button>

                          <span>{quantity}</span>

                          <button
                            type="button"
                            aria-label={`Increase quantity of ${product.name}`}
                            disabled={quantity >= product.stock}
                            onClick={() =>
                              onQuantityChange(
                                product.id,
                                quantity + 1,
                              )
                            }
                          >
                            +
                          </button>
                        </div>

                        {exceedsStock && product.stock > 0 && (
                          <button
                            className="remove-cart-button"
                            type="button"
                            onClick={() =>
                              onQuantityChange(
                                product.id,
                                product.stock,
                              )
                            }
                          >
                            Set quantity to {product.stock}
                          </button>
                        )}

                        <button
                          className="remove-cart-button"
                          type="button"
                          aria-label={`Remove ${product.name} from cart`}
                          onClick={() => onRemove(product.id)}
                        >
                          Remove
                        </button>
                      </div>

                      <strong>
                        {currencyFormatter.format(
                          (product.pricePaise * quantity) / 100,
                        )}
                      </strong>
                    </li>
                  );
                })}

                {unavailableItems.map((item) => (
                  <li className="cart-item" key={item.productId}>
                    <div>
                      <h3>Unavailable product</h3>

                      <p>Product ID: {item.productId}</p>
                      <p>Saved quantity: {item.quantity}</p>

                      <p>
                        This product is no longer in the catalogue.
                      </p>

                      <button
                        className="remove-cart-button"
                        type="button"
                        aria-label={`Remove unavailable product ${item.productId} from cart`}
                        onClick={() => onRemove(item.productId)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {!hasCartIssues && (
                <p className="cart-subtotal">
                  <span>Subtotal</span>

                  <strong>
                    {currencyFormatter.format(subtotalPaise / 100)}
                  </strong>
                </p>
              )}
            </>
          )}

          <div className="cart-actions">
            {canCheckout ? (
              <Link
                className="primary-link checkout-link"
                to="/checkout"
              >
                Proceed to checkout
              </Link>
            ) : (
              <button
                className="primary-link checkout-link"
                type="button"
                disabled
              >
                Proceed to checkout
              </button>
            )}

            <button
              className="clear-cart-button"
              type="button"
              onClick={() => dialogRef.current?.showModal()}
            >
              Clear cart
            </button>
          </div>
        </>
      )}

      <dialog
        ref={dialogRef}
        className="confirmation-dialog"
        aria-labelledby="clear-cart-title"
        aria-describedby="clear-cart-description"
      >
        <h2 id="clear-cart-title">Clear your cart?</h2>

        <p id="clear-cart-description">
          This will remove every item from your cart.
        </p>

        <div className="dialog-actions">
          <button
            className="dialog-cancel-button"
            type="button"
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>

          <button
            className="dialog-confirm-button"
            type="button"
            onClick={confirmClearCart}
          >
            Yes, clear cart
          </button>
        </div>
      </dialog>
    </section>
  );
}