import { useRef } from 'react';
import { Link } from 'react-router';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../hooks/useCart';
import ProductPurchaseControls from '../components/ProductPurchaseControls';
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
export default function WishlistPage() {
  const { list, busy, canEdit, save, reorder, reload } = useWishlist();
  const { cartItems, addToCart } = useCart();
  const dragged = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  async function move(id: string, target: number) {
    if (!canEdit || !list) return;
    const ids = list.items.map(item => item.id);
    const from = ids.indexOf(id);
    if (from < 0 || target < 0 || target >= ids.length || from === target) return;
    ids.splice(from, 1); ids.splice(target, 0, id);
    await reorder(ids);
  }
  return <section className="shop-section" aria-labelledby="wishlist-title">
    <h1 id="wishlist-title" ref={heading} tabIndex={-1}>Your wishlist</h1>
    <p>Save up to 100 products. Saving does not reserve stock or lock in a price.</p>
    <p id="wishlist-reorder-help">Drag a product’s handle onto another product to move it to that position, or use Move up and Move down.</p>
    <button type="button" className="clear-search-button" aria-disabled={busy} onClick={() => { if (!busy) reload(); }}>Reload wishlist</button>
    {list && list.items.length === 0 && <p>Your wishlist is empty. <Link to="/shop">Explore the shop</Link>.</p>}
    <ol className="wishlist-list" aria-describedby="wishlist-reorder-help" aria-busy={busy}>
      {list?.items.map((product, index) => <li key={product.id} className="wishlist-item"
        onDragOver={event => { if (canEdit && dragged.current) event.preventDefault(); }}
        onDrop={event => { event.preventDefault(); const id = dragged.current; dragged.current = null; if (id) void move(id, index); }}>
        <div className="wishlist-item-heading">
          <span draggable={canEdit} className="wishlist-drag-handle" aria-hidden="true"
            onDragStart={event => { dragged.current = product.id; event.dataTransfer.setData('text/plain', product.id); event.dataTransfer.effectAllowed = 'move'; }}
            onDragEnd={() => { dragged.current = null; }}>⠿</span>
          <h2><Link to={`/shop/${encodeURIComponent(product.id)}`}>{product.name}</Link></h2>
          <span>{money.format(product.pricePaise / 100)}</span>
        </div>
        <p>{product.category}</p>
        <ProductPurchaseControls product={product} quantityInCart={cartItems.find(item => item.productId === product.id)?.quantity ?? 0} onAddToCart={addToCart} />
        <div className="cart-actions">
          <button className="wishlist-button" type="button" aria-label={`Move ${product.name} up`} aria-disabled={!canEdit || index === 0} onClick={() => void move(product.id, index - 1)}>Move up</button>
          <button className="wishlist-button" type="button" aria-label={`Move ${product.name} down`} aria-disabled={!canEdit || index === list.items.length - 1} onClick={() => void move(product.id, index + 1)}>Move down</button>
          <button className="wishlist-button" type="button"
            ref={element => {
              if (element) removeButtons.current.set(product.id, element);
              else removeButtons.current.delete(product.id);
            }}
            aria-label={`Remove ${product.name} from wishlist`} aria-disabled={!canEdit}
            onClick={event => {
              if (!canEdit) return;
              const trigger = event.currentTarget;
              const neighborId = list.items[index + 1]?.id ?? list.items[index - 1]?.id;
              void save(product.id, true).then(ok => {
                if (!ok) return;
                window.requestAnimationFrame(() => {
                  // Keep focus local without stealing it if the user moved elsewhere.
                  if (document.activeElement !== trigger && document.activeElement !== document.body) return;
                  const target = neighborId ? removeButtons.current.get(neighborId) : null;
                  (target ?? heading.current)?.focus({ preventScroll: true });
                });
              });
            }}>Remove</button>
        </div>
      </li>)}
    </ol>
  </section>;
}
