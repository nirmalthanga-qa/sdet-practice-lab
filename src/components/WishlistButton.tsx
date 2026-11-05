import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useWishlist } from '../hooks/useWishlist';
import type { Product } from '../types/product';
export default function WishlistButton({ product }: { product: Product }) {
  const { authState } = useAuth();
  const { list, canEdit, save } = useWishlist();
  const saved = list?.items.some(item => item.id === product.id) ?? false;
  if (authState.status === 'anonymous') return <Link className="wishlist-button" to="/login" state={{ returnTo: '/wishlist' }}>Sign in to save products</Link>;
  return <button className="wishlist-button" type="button" aria-pressed={saved}
    aria-label={`Save ${product.name} to wishlist`} aria-disabled={!canEdit}
    onClick={() => { if (canEdit) void save(product.id, saved); }}>
    <span aria-hidden="true">{saved ? '♥' : '♡'}</span> {saved ? 'Saved to wishlist' : 'Save to wishlist'}
  </button>;
}
