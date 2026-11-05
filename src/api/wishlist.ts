import type { Product } from '../types/product';
import { isProduct } from '../utils/isProduct';
export type Wishlist = { version: number; items: Product[] };
export async function requestWishlist(path = '', method = 'GET', body?: unknown, signal?: AbortSignal): Promise<Wishlist> {
  const response = await fetch(`/api/wishlist${path}`, {
    method, credentials: 'same-origin', cache: 'no-store', signal,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    if (response.status === 401) throw new Error('Please sign in again to use your wishlist.');
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'object' && data.error !== null && 'message' in data.error && typeof data.error.message === 'string') throw new Error(data.error.message);
    throw new Error('Wishlist request failed. Please reload.');
  }
  if (typeof data !== 'object' || data === null || !('version' in data) || typeof data.version !== 'number' || !Number.isSafeInteger(data.version) || data.version < 0 || !('items' in data) || !Array.isArray(data.items) || data.items.length > 100 || !data.items.every(isProduct) || new Set(data.items.map(item => item.id)).size !== data.items.length) {
    throw new Error('Invalid wishlist response. Please reload.');
  }
  return { version: data.version, items: data.items };
}
