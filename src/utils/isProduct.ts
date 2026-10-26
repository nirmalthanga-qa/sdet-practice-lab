import type { Product } from '../types/product';

export function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'description' in value &&
    typeof value.description === 'string' &&
    'category' in value &&
    (value.category === 'Workspace' || value.category === 'Audio') &&
    'pricePaise' in value &&
    typeof value.pricePaise === 'number' &&
    Number.isSafeInteger(value.pricePaise) &&
    value.pricePaise >= 0 &&
    'stock' in value &&
    typeof value.stock === 'number' &&
    Number.isSafeInteger(value.stock) &&
    value.stock >= 0 &&
    'icon' in value &&
    typeof value.icon === 'string'
  );
}