import AdminUsersPage from "./pages/AdminUsersPage";
import AdminDiscountsPage from "./pages/AdminDiscountsPage";
import { Link, Route, Routes } from "react-router";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AdminInventoryPage from "./pages/AdminInventoryPage";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SignedOutPage from "./pages/SignedOutPage";
import RequireAuth from "./components/RequireAuth";
import "./App.css";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import GuestCartTransfer from "./components/GuestCartTransfer";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import OrdersPage from "./pages/OrdersPage";
import RouteFocus from "./components/RouteFocus";
import BackToTop from "./components/BackToTop";

import WishlistPage from "./pages/WishlistPage";
import WishlistStatus from "./components/WishlistStatus";

function App() {
  return (
    <>
      <a id="page-top" className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Header />
      <RouteFocus />

      <main id="main-content" tabIndex={-1}>
        <GuestCartTransfer />
        <WishlistStatus />

        <Routes>
          <Route path="/wishlist" element={<RequireAuth><WishlistPage /></RequireAuth>} />
          <Route path="/admin/users" element={<RequireAuth><AdminUsersPage /></RequireAuth>} />
          <Route path="/admin/discounts" element={<RequireAuth><AdminDiscountsPage /></RequireAuth>} />
          <Route
            path="/admin/inventory"
            element={
              <RequireAuth>
                <AdminInventoryPage />
              </RequireAuth>
            }
          />
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signed-out" element={<SignedOutPage />} />
          <Route path="/shop/:productId" element={<ProductDetailsPage />} />
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/orders/:orderId"
            element={
              <RequireAuth>
                <OrderDetailsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/orders"
            element={
              <RequireAuth>
                <OrdersPage />
              </RequireAuth>
            }
          />
          <Route
            path="*"
            element={
              <section className="hero">
                <h1>Page not found</h1>
                <p className="hero-description">
                  That page doesn’t exist. Let’s head back home.
                </p>
                <Link className="primary-link" to="/">
                  Back to home
                </Link>
              </section>
            }
          />
        </Routes>
      </main>
      <BackToTop />
      <Footer />
    </>
  );
}

export default App;
