import { useCategories } from '../hooks/useCategories';
import { useEffect, useState } from 'react';
import ProductSearch from '../components/ProductSearch';
import ProductCard from '../components/ProductCard';
import CartPanel from '../components/CartPanel';
import ProductComparison from '../components/ProductComparison';
import type { Product } from '../types/product';
import { useCart } from '../hooks/useCart';
import { isProduct } from '../utils/isProduct';

type CategoryFilter = string;
type SortOption = 'default' | 'price-asc' | 'price-desc';

type ProductsState =
  | { status: 'loading' }
  | { status: 'success'; products: Product[] }
  | { status: 'error'; message: string };



const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'default', label: 'Default order' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

const priceStepPaise = 10_000;
const pageSizes = [4, 8, 12, 16, 20];
const comparisonLimit = 3;

export default function ShopPage() {
  const { categories, status: categoryStatus, refreshing: categoriesRefreshing, refreshError: categoryRefreshError, reload: reloadCategories } = useCategories();
  const [productsState, setProductsState] =
    useState<ProductsState>({ status: 'loading' });
  const [requestVersion, setRequestVersion] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [maxPricePaise, setMaxPricePaise] = useState<number | null>(
    null,
  );
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [pageSize, setPageSize] = useState(8);
  const [requestedPage, setRequestedPage] = useState(1);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);

  const {
    cartItems,
    cartCount,
    cartProducts,
    isCartSaving,
    isCartRefreshing,
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
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(
            `Product request failed: ${response.status}`,
          );
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

        const loadedProducts = data.products;
        const productIds = new Set(
          loadedProducts.map((product) => product.id),
        );

        if (productIds.size !== loadedProducts.length) {
          throw new Error('Duplicate product IDs');
        }

        if (!controller.signal.aborted) {
          setProductsState({
            status: 'success',
            products: loadedProducts,
          });

          setComparisonIds((current) =>
            current.filter((id) => productIds.has(id)),
          );
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
    productsState.status === 'success'
      ? productsState.products
      : [];

  const comparedProducts = comparisonIds.flatMap((productId) => {
    const product = products.find((item) => item.id === productId);

    return product ? [product] : [];
  });

  const highestPricePaise = products.reduce(
    (highest, product) => Math.max(highest, product.pricePaise),
    0,
  );

  const priceCeilingPaise = Math.max(
    priceStepPaise,
    Math.ceil(highestPricePaise / priceStepPaise) * priceStepPaise,
  );

  const selectedMaxPricePaise = Math.min(
    maxPricePaise ?? priceCeilingPaise,
    priceCeilingPaise,
  );

  const params = new URLSearchParams();
  if (searchTerm.trim()) params.set('q', searchTerm.trim());
  if (selectedCategory !== '') params.set('category', selectedCategory);
  if (inStockOnly) params.set('inStock', 'true');
  if (maxPricePaise !== null) params.set('maxPricePaise', String(selectedMaxPricePaise));
  if (sortBy !== 'default') params.set('sort', sortBy);
  const paramsHaveSearch = params.has('q');
  params.set('page', String(requestedPage));
  params.set('pageSize', String(pageSize));
  const query = params.toString();

  const [result, setResult] = useState<{
    query: string;
    version: number;
    products: Product[] | null;
    total: number;
    totalPages: number;
  } | null>(null);

  const [lastSuccessfulPage, setLastSuccessfulPage] = useState<{
    products: Product[];
    total: number;
    totalPages: number;
    page: number;
    pageSize: number;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      try {
        const response = await fetch('/api/products?' + query, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Catalogue page unavailable');

        const data: unknown = await response.json();
        if (
          typeof data !== 'object' || data === null ||
          !('products' in data) || !Array.isArray(data.products) ||
          !data.products.every(isProduct) ||
          !('total' in data) || typeof data.total !== 'number' ||
          !Number.isSafeInteger(data.total) || data.total < 0 ||
          !('page' in data) || data.page !== requestedPage ||
          !('pageSize' in data) || data.pageSize !== pageSize ||
          !('totalPages' in data) || typeof data.totalPages !== 'number' ||
          data.totalPages !== Math.ceil(data.total / pageSize)
        ) throw new Error('Invalid catalogue page');

        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, data.totalPages);
        if (requestedPage > lastPage) {
          setRequestedPage(lastPage);
          return;
        }

        const products = data.products;
        const total = data.total;
        const totalPages = data.totalPages;
        setResult({query, version: requestVersion, products, total, totalPages});
        setLastSuccessfulPage({ products, total, totalPages, page: requestedPage, pageSize });
      } catch {
        if (!controller.signal.aborted) {
          setResult({
            query, version: requestVersion, products: null,
            total: 0, totalPages: 0,
          });
        }
      }
    }

    // Debounce typed searches. Page navigation without a search runs immediately.
    const timer = window.setTimeout(() => void loadPage(), paramsHaveSearch ? 200 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, requestVersion, requestedPage, pageSize, paramsHaveSearch]);

  const currentResult = result?.query === query && result.version === requestVersion
    ? result : null;
  const searching = currentResult === null;
  const searchFailed = currentResult?.products === null;
  // Retain the last complete page until its replacement is ready.
  // Its pagination labels must describe the products still on screen.
  const paginatedProducts = searchFailed ? [] : lastSuccessfulPage?.products ?? [];
  const total = searchFailed ? 0 : lastSuccessfulPage?.total ?? 0;
  const totalPages = searchFailed ? 0 : lastSuccessfulPage?.totalPages ?? 0;
  const currentPage = lastSuccessfulPage?.page ?? requestedPage;
  const displayedPageSize = lastSuccessfulPage?.pageSize ?? pageSize;
  const pageStart = (currentPage - 1) * displayedPageSize;

  const term = searchTerm.trim().toLowerCase();
  const suggestions = term ? products.filter((product) =>
    product.name.toLowerCase().includes(term) &&
    (selectedCategory === '' || product.category === selectedCategory) &&
    (!inStockOnly || product.stock > 0) &&
    product.pricePaise <= selectedMaxPricePaise
  ) : [];
  if (sortBy === 'price-asc') suggestions.sort((a, b) => a.pricePaise - b.pricePaise);
  if (sortBy === 'price-desc') suggestions.sort((a, b) => b.pricePaise - a.pricePaise);

  function changePage(page: number) {
    setRequestedPage(Math.max(1, Math.min(page, totalPages)));
  }

  function toggleComparison(productId: string) {
    if (!products.some((product) => product.id === productId)) {
      return;
    }

    setComparisonIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }

      if (current.length >= comparisonLimit) {
        return current;
      }

      return [...current, productId];
    });
  }

  function removeFromComparison(productId: string) {
    setComparisonIds((current) =>
      current.filter((id) => id !== productId),
    );
  }

  function clearComparison() {
    setComparisonIds([]);
  }

  function retryLoadingProducts() {
    setRequestedPage(1);
    setProductsState({ status: 'loading' });
    setRequestVersion((current) => current + 1);
  }

  function resetFilters() {
    setSearchTerm('');
    setSelectedCategory('');
    setInStockOnly(false);
    setSortBy('default');
    setMaxPricePaise(null);
    setRequestedPage(1);
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

      <p
        className="cart-save-status"
        role="status"
        aria-atomic="true"
      >
        {isCartSaving || isCartRefreshing ? 'Updating your cart…' : ''}
      </p>

      <div hidden={!isCartOpen}>
        <CartPanel
          items={cartProducts}
          onQuantityChange={updateCartQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
        />
      </div>

      <p
        role="status"
        aria-atomic="true"
        className="product-count"
      >
        {productsState.status === 'loading'
          ? 'Loading products…'
          : productsState.status === 'success'
            ? searching ? 'Loading products…' : searchFailed ? '' : `${total} ${
                total === 1
                  ? 'product'
                  : 'products'
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
          <ProductSearch
            value={searchTerm}
            matches={suggestions}
            onChange={(value) => {
              setSearchTerm(value);
              setRequestedPage(1);
            }}
          />

          <div className="shop-dropdowns">
            <div className="category-field">
              <label htmlFor="product-category">Category</label>

              <select
                id="product-category"
                disabled={categoryStatus !== 'ready'}
                value={selectedCategory}
                onChange={(event) => {
                  setSelectedCategory(event.target.value);
                  setRequestedPage(1);
                }}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>{category.name}</option>
                ))}
              </select>
              <p className="refresh-status" role="status">{categoryStatus === 'loading' ? 'Loading categories…' : categoriesRefreshing ? 'Refreshing categories…' : ''}</p>
              {categoryRefreshError && <>
                <p role="alert">{categoryRefreshError}</p>
                <button className="clear-search-button" type="button" onClick={reloadCategories}>Retry categories</button>
              </>}
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
                    setRequestedPage(1);
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

          <div className="price-filter">
            <div className="price-filter-heading">
              <label htmlFor="product-max-price">
                Maximum price
              </label>

              <span>
                {currencyFormatter.format(
                  selectedMaxPricePaise / 100,
                )}
              </span>
            </div>

            <input
              id="product-max-price"
              type="range"
              min={0}
              max={priceCeilingPaise}
              step={priceStepPaise}
              value={selectedMaxPricePaise}
              disabled={products.length === 0}
              aria-valuetext={currencyFormatter.format(
                selectedMaxPricePaise / 100,
              )}
              aria-describedby="product-max-price-help"
              onChange={(event) => {
                const value = event.currentTarget.valueAsNumber;

                if (Number.isFinite(value)) {
                  setMaxPricePaise(
                    value === priceCeilingPaise ? null : value,
                  );
                  setRequestedPage(1);
                }
              }}
            />

            <p id="product-max-price-help" className="field-help">
              Show products priced at or below this amount.
              Use arrow keys to adjust by ₹100.
            </p>
          </div>

          <label className="stock-switch">
            <input
              type="checkbox"
              role="switch"
              checked={inStockOnly}
              onChange={(event) => {
                setInStockOnly(event.target.checked);
                setRequestedPage(1);
              }}
            />

            <span
              className="stock-switch-track"
              aria-hidden="true"
            />
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

          <p
            id="comparison-selection-help"
            className="field-help"
            role="status"
            aria-atomic="true"
          >
            {comparisonIds.length} of {comparisonLimit} products
            selected for comparison.
            {comparisonIds.length === comparisonLimit
              ? ' Remove a selection to compare another product.'
              : ' Select products using the checkboxes on their cards.'}
          </p>

          <ProductComparison
            products={comparedProducts}
            onRemove={removeFromComparison}
            onClear={clearComparison}
          />

          <p className="catalogue-update-status" role="status" aria-atomic="true">
            {searching
              ? lastSuccessfulPage
                ? 'Updating products… Previous results remain visible.'
                : 'Loading products…'
              : searchFailed ? '' : `${total} products found.`}
          </p>

          {searchFailed ? (
            <div className="empty-state">
              <p role="alert">Search is unavailable. Please try again.</p>
              <button className="clear-search-button" type="button"
                onClick={() => setRequestVersion((current) => current + 1)}>
                Retry search
              </button>
            </div>
          ) : total > 0 ? (
            <div className="products-grid" aria-busy={searching}>
              {paginatedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={
                    cartItems.find(
                      (item) => item.productId === product.id,
                    )?.quantity ?? 0
                  }
                  onAddToCart={addToCart}
                  isCompared={comparisonIds.includes(product.id)}
                  comparisonDisabled={
                    comparisonIds.length >= comparisonLimit &&
                    !comparisonIds.includes(product.id)
                  }
                  onToggleComparison={toggleComparison}
                />
              ))}
            </div>
          ) : searching ? null : (
            <div className="empty-state">
              <h2>No products found</h2>
              <p>
                Try different filters or use Reset filters to see
                all products.
              </p>
            </div>
          )}

          <div className="shop-pagination">
            <label htmlFor="shop-page-size">Products per page</label>
            <select
              id="shop-page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.currentTarget.value));
                setRequestedPage(1);
              }}
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {total > 0 && (
            <nav
              className="shop-pagination"
              aria-label="Product pagination"
            >
              <button
                className="clear-search-button"
                type="button"
                disabled={searching || currentPage === 1}
                onClick={() => changePage(currentPage - 1)}
              >
                Previous
              </button>

              <p role="status" aria-atomic="true">
                Page {currentPage} of {totalPages}
                {' · '}
                Showing {pageStart + 1}–
                {Math.min(
                  pageStart + displayedPageSize,
                  total,
                )}
                {' of '}
                {total} products
              </p>

              <button
                className="clear-search-button"
                type="button"
                disabled={searching || currentPage === totalPages}
                onClick={() => changePage(currentPage + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}