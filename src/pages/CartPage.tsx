import { Link } from 'react-router';
import CartPanel from '../components/CartPanel';
import { useCart } from '../hooks/useCart';

export default function CartPage() {
    const {
        cartCount,
        cartProducts,
        updateCartQuantity,
        removeFromCart,
        clearCart,
    } = useCart();

    return (
        <section className="shop-section" aria-labelledby="cart-page-title">
            <Link className="back-to-shop" to="/shop">
                ← Continue shopping
            </Link>

            <div className="shop-heading">
                <p className="eyebrow">YOUR SHOPPING BAG</p>

                <h1 id="cart-page-title">Review your cart.</h1>

                <p className="hero-description">
                    Adjust quantities or remove products before continuing.
                </p>
            </div>

            <p className="product-count" role="status" aria-atomic="true">
                {cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart
            </p>

            <CartPanel
                items={cartProducts}
                onQuantityChange={updateCartQuantity}
                onRemove={removeFromCart}
                onClear={clearCart}
            />
            {cartCount > 0 && (
                <Link className="primary-link checkout-link" to="/checkout">
                    Proceed to checkout
                </Link>
            )}
        </section>
    );
}