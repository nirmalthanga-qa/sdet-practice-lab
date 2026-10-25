import { useRef } from 'react';
import type { Product } from '../types/product';

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const subtotalPaise = items.reduce(
    (total, item) => total + item.product.pricePaise * item.quantity,
    0,
  );

  function confirmClearCart() {
    dialogRef.current?.close();
    onClear();

    // Keep keyboard focus in the cart after its controls disappear.
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

      {items.length === 0 ? (
        <p>Your cart is empty. Add a product to get started.</p>
      ) : (
        <>
          <ul className="cart-items">
            {items.map(({ product, quantity }) => (
              <li className="cart-item" key={product.id}>
                <div>
                  <h3>{product.name}</h3>

                  <p>
                    {currencyFormatter.format(product.pricePaise / 100)} each
                  </p>

                  <div
                    className="cart-quantity-controls"
                    role="group"
                    aria-label={`Quantity for ${product.name}`}
                  >
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${product.name}`}
                      disabled={quantity <= 1}
                      onClick={() =>
                        onQuantityChange(product.id, quantity - 1)
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
                        onQuantityChange(product.id, quantity + 1)
                      }
                    >
                      +
                    </button>
                  </div>

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
            ))}
          </ul>

          <p className="cart-subtotal">
            <span>Subtotal</span>
            <strong>
              {currencyFormatter.format(subtotalPaise / 100)}
            </strong>
          </p>

          <button
            className="clear-cart-button"
            type="button"
            onClick={() => dialogRef.current?.showModal()}
          >
            Clear cart
          </button>
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