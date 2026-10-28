import { useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";

export default function Header() {
  const location = useLocation();

  // Reset the menu when navigation changes the location.
  return <HeaderContent key={location.key} />;
}

function HeaderContent() {
  const { cartCount } = useCart();
  const { authState, refreshAuth } = useAuth();
  const navigate = useNavigate();

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const logoutBusyRef = useRef(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  function closeMenu() {
    setIsMenuOpen(false);
  }

  async function handleLogout() {
    if (logoutBusyRef.current) {
      return;
    }

    logoutBusyRef.current = true;
    setIsSigningOut(true);
    setLogoutError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (response.status !== 204) {
        setLogoutError("We couldn’t sign you out. Please try again.");
        return;
      }

      refreshAuth();
      navigate("/signed-out", { replace: true });
    } catch {
      setLogoutError("Unable to connect. Please try signing out again.");
    } finally {
      logoutBusyRef.current = false;
      setIsSigningOut(false);
    }
  }

  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          isMenuOpen &&
          window.matchMedia("(max-width: 1350px)").matches
        ) {
          event.preventDefault();
          closeMenu();
          menuButtonRef.current?.focus();
        }
      }}
    >
      <Link
        className="brand"
        to="/"
        aria-label="SDET Practice Lab home"
        onClick={closeMenu}
      >
        <span className="brand-icon" aria-hidden="true">
          {"</>"}
        </span>

        <span className="brand-text">
          <span>SDET Practice Lab</span>
          <span className="brand-credit">by Nirmal Kumar</span>
        </span>
      </Link>

      <button
        ref={menuButtonRef}
        className="header-menu-toggle"
        type="button"
        aria-label="Main menu"
        aria-expanded={isMenuOpen}
        aria-controls="header-menu"
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          {isMenuOpen ? (
            <>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </>
          ) : (
            <>
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </>
          )}
        </svg>
      </button>

      <div
        id="header-menu"
        className={`header-menu${isMenuOpen ? " is-open" : ""}`}
      >
        <nav className="main-navigation" aria-label="Main navigation">
          <NavLink to="/" end onClick={closeMenu}>
            Home
          </NavLink>

          <NavLink to="/shop" onClick={closeMenu}>
            Practice Shop
          </NavLink>

          <NavLink to="/orders" onClick={closeMenu}>
            My orders
          </NavLink>
        </nav>

        <div className="header-actions">
          <NavLink className="header-cart-count" to="/cart" onClick={closeMenu}>
            <span aria-hidden="true">🛒</span>
            Cart: {cartCount} {cartCount === 1 ? "item" : "items"}
          </NavLink>

          <div className="header-account">
            <span
              className="header-account-status"
              role="status"
              aria-atomic="true"
            >
              {authState.status === "loading"
                ? "Checking account…"
                : authState.status === "authenticated"
                  ? `Hi, ${authState.user.fullName}`
                  : authState.status === "error"
                    ? "Account status unavailable"
                    : ""}
            </span>

            {authState.status === "anonymous" && (
              <NavLink
                className="primary-link header-auth-control"
                to="/login"
                onClick={closeMenu}
              >
                Sign in
              </NavLink>
            )}

            {authState.status === "authenticated" && (
              <button
                className="primary-link header-auth-control"
                type="button"
                disabled={isSigningOut}
                onClick={handleLogout}
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            )}

            {authState.status === "error" && (
              <button
                className="primary-link header-auth-control"
                type="button"
                onClick={() => {
                  setLogoutError("");
                  refreshAuth();
                }}
              >
                Retry account check
              </button>
            )}

            <p className="header-account-error" role="alert" aria-atomic="true">
              {logoutError}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
