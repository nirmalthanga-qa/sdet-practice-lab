import { Link, Route, Routes } from 'react-router';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import './App.css';
import ProductDetailsPage from './pages/ProductDetailsPage';

function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Header />

      <main id="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route
            path="/shop/:productId"
            element={<ProductDetailsPage />}
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

      <Footer />
    </>
  );
}

export default App;