import type { Product } from '../types/product';

type ProductComparisonProps = {
  products: readonly Product[];
  onRemove: (productId: string) => void;
  onClear: () => void;
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export default function ProductComparison({
  products,
  onRemove,
  onClear,
}: ProductComparisonProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section
      className="product-comparison"
      aria-labelledby="comparison-title"
    >
      <div className="comparison-heading">
        <h2 id="comparison-title">Compare products</h2>

        <button
          className="clear-search-button"
          type="button"
          onClick={onClear}
        >
          Clear comparison
        </button>
      </div>

      <p className="field-help">
        Compare up to three products. Adding a product to this table
        does not add it to your cart.
      </p>

      <div
        className="comparison-table-wrapper"
        role="region"
        aria-label="Product comparison table"
        tabIndex={0}
      >
        <table className="comparison-table">
          <caption>
            Prices and availability from the loaded catalogue
          </caption>

          <thead>
            <tr>
              <th scope="col">Feature</th>

              {products.map((product) => (
                <th scope="col" key={product.id}>
                  {product.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr>
              <th scope="row">Category</th>

              {products.map((product) => (
                <td key={product.id}>{product.category}</td>
              ))}
            </tr>

            <tr>
              <th scope="row">Price</th>

              {products.map((product) => (
                <td key={product.id}>
                  {currencyFormatter.format(
                    product.pricePaise / 100,
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row">Availability</th>

              {products.map((product) => (
                <td key={product.id}>
                  {product.stock > 0
                    ? `${product.stock} in stock`
                    : 'Out of stock'}
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row">Description</th>

              {products.map((product) => (
                <td key={product.id}>{product.description}</td>
              ))}
            </tr>

            <tr>
              <th scope="row">Manage comparison</th>

              {products.map((product) => (
                <td key={product.id}>
                  <button
                    className="clear-search-button"
                    type="button"
                    aria-label={`Remove ${product.name} from comparison`}
                    onClick={() => onRemove(product.id)}
                  >
                    Remove
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}