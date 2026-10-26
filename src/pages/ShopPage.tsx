import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import CartPanel from '../components/CartPanel';
import type { Product } from '../types/product';
import { useCart } from '../hooks/useCart';
import { isProduct } from '../utils/isProduct';

type CategoryFilter = 'All' | Product['category'];
type SortOption = 'default' | 'price-asc' | 'price-desc';

type ProductsState =
  | { status: 'loading' }
  | { status: 'success'; products: Product[] }
  | { status: 'error'; message: string };

const categories: CategoryFilter[] = ['All', 'Workspace', 'Audio'];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'default', label: 'Default order' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

export default function ShopPage() {
  const [productsState, setProductsState] =
    useState<ProductsState>({ status: 'loading' });
  const [requestVersion, setRequestVersion] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const {
    cartItems,
    cartCount,
    cartProducts,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch('/api/products', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Product request failed: ${response.status}`);
        }

        const data: unknown = await response.json();

        if (
          typeof data !== 'object' ||
          data === null ||
          !('products' in data) ||
          !Array.isArray(data.products) ||
          !data.products.every(isProduct)
        ) {
          throw new Error('Invalid products response');
        }

        if (!controller.signal.aborted) {
          setProductsState({
            status: 'success',
            products: data.products,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setProductsState({
            status: 'error',
            message:
              'We couldn’t load the products. Please try again.',
          });
        }
      }
    }

    void loadProducts();

    return () => controller.abort();
  }, [requestVersion]);

  const products =
    productsState.status === 'success' ? productsState.products : [];

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(normalizedSearch);

    const matchesCategory =
      selectedCategory === 'All' ||
      product.category === selectedCategory;

    const matchesStock = !inStockOnly || product.stock > 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const displayedProducts = [...filteredProducts];

  if (sortBy === 'price-asc') {
    displayedProducts.sort((a, b) => a.pricePaise - b.pricePaise);
  } else if (sortBy === 'price-desc') {
    displayedProducts.sort((a, b) => b.pricePaise - a.pricePaise);
  }

  function retryLoadingProducts() {
    setProductsState({ status: 'loading' });
    setRequestVersion((current) => current + 1);
  }

  function resetFilters() {
    setSearchTerm('');
    setSelectedCategory('All');
    setInStockOnly(false);
    setSortBy('default');
  }

  return (
    <section className="shop-section" aria-labelledby="shop-title">
      <div className="shop-heading">
        <p className="eyebrow">PRACTICE APPLICATION</p>

        <h1 id="shop-title">Explore the collection.</h1>

        <p className="hero-description">
          Everyday essentials. Real opportunities to practise testing.
        </p>

        <p className="sample-data-note">
          Demo catalogue. No real purchases or payments.
        </p>
      </div>

      <div className="cart-summary">
        <span aria-hidden="true">🛒</span>

        <p role="status" aria-atomic="true">
          Your cart: <strong>{cartCount}</strong>{' '}
          {cartCount === 1 ? 'item' : 'items'}
        </p>

        <button
          className="cart-toggle-button"
          type="button"
          aria-expanded={isCartOpen}
          aria-controls="cart-panel"
          onClick={() => setIsCartOpen((current) => !current)}
        >
          {isCartOpen ? 'Hide cart' : 'View cart'}
        </button>
      </div>

      <div hidden={!isCartOpen}>
        <CartPanel
          items={cartProducts}
          onQuantityChange={updateCartQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
        />
      </div>

      <p role="status" aria-atomic="true" className="product-count">
        {productsState.status === 'loading'
          ? 'Loading products…'
          : productsState.status === 'success'
            ? `${displayedProducts.length} ${
                displayedProducts.length === 1 ? 'product' : 'products'
              } found`
            : ''}
      </p>

      {productsState.status === 'error' && (
        <div className="empty-state">
          <p role="alert">{productsState.message}</p>

          <button
            className="primary-link"
            type="button"
            onClick={retryLoadingProducts}
          >
            Try again
          </button>
        </div>
      )}

      {productsState.status === 'success' && (
        <>
          <div className="search-field">
            <label htmlFor="product-search">Search products</label>

            <input
              id="product-search"
              type="search"
              placeholder="Try keyboard or headphones"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="shop-dropdowns">
            <div className="category-field">
              <label htmlFor="product-category">Category</label>

              <select
                id="product-category"
                value={selectedCategory}
                onChange={(event) => {
                  const category = categories.find(
                    (item) => item === event.target.value,
                  );

                  if (category !== undefined) {
                    setSelectedCategory(category);
                  }
                }}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'All' ? 'All categories' : category}
                  </option>
                ))}
              </select>
            </div>

            <div className="category-field">
              <label htmlFor="product-sort">Sort by</label>

              <select
                id="product-sort"
                value={sortBy}
                onChange={(event) => {
                  const option = sortOptions.find(
                    (item) => item.value === event.target.value,
                  );

                  if (option !== undefined) {
                    setSortBy(option.value);
                  }
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="stock-switch">
            <input
              type="checkbox"
              role="switch"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
            />

            <span className="stock-switch-track" aria-hidden="true" />
            <span>In stock only</span>
          </label>

          <div className="results-toolbar">
            <button
              className="clear-search-button"
              type="button"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>

          {displayedProducts.length > 0 ? (
            <div className="products-grid">
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={
                    cartItems.find(
                      (item) => item.productId === product.id,
                    )?.quantity ?? 0
                  }
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No products found</h2>
              <p>
                Try different filters or use Reset filters to see all
                products.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}