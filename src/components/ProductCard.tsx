import { Link } from 'react-router';
import type { Product } from '../types/product';
import ProductPurchaseControls from './ProductPurchaseControls';

type ProductCardProps = {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
};

export default function ProductCard({
  product,
  quantityInCart,
  onAddToCart,
}: ProductCardProps) {
  return (
    <article
      className="product-card"
      aria-labelledby={`product-title-${product.id}`}
    >
      <div className="product-visual">
        <span aria-hidden="true">{product.icon}</span>
      </div>

      <div className="product-content">
        <p className="product-category">{product.category}</p>

        <h2 id={`product-title-${product.id}`}>
          <Link
            className="product-title-link"
            to={`/shop/${encodeURIComponent(product.id)}`}
          >
            {product.name}
          </Link>
        </h2>

        <p className="product-description">{product.description}</p>

        <ProductPurchaseControls
          product={product}
          quantityInCart={quantityInCart}
          onAddToCart={onAddToCart}
        />
      </div>
    </article>
  );
}