import { Link, NavLink } from 'react-router';
import { useCart } from '../hooks/useCart';

export default function Header() {
  const { cartCount } = useCart();

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="SDET Practice Lab home">
        <span className="brand-icon" aria-hidden="true">
          {'</>'}
        </span>

        <span className="brand-text">
          <span>SDET Practice Lab</span>
          <span className="brand-credit">by Nirmal Kumar</span>
        </span>
      </Link>

      <nav className="main-navigation" aria-label="Main navigation">
        <NavLink to="/" end>
          Home
        </NavLink>

        <NavLink to="/shop">
          Practice Shop
        </NavLink>
      </nav>

      <NavLink className="header-cart-count" to="/cart">
        <span aria-hidden="true">🛒</span>
        Cart: {cartCount} {cartCount === 1 ? 'item' : 'items'}
      </NavLink>
    </header>
  );
}