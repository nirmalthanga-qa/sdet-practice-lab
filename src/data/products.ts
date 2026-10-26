import type { Product } from '../types/product.js';

export const products: Product[] = [
  {
    id: 'keyboard',
    name: 'Orbit Mechanical Keyboard',
    description: 'A comfortable keyboard for everyday coding and testing.',
    category: 'Workspace',
    pricePaise: 649900,
    stock: 18,
    icon: '⌨️',
  },
  {
    id: 'headphones',
    name: 'Studio Wireless Headphones',
    description: 'Stay focused with comfortable wireless headphones.',
    category: 'Audio',
    pricePaise: 899900,
    stock: 12,
    icon: '🎧',
  },
  {
    id: 'speaker',
    name: 'Pocket Bluetooth Speaker',
    description: 'A compact speaker for your workspace and beyond.',
    category: 'Audio',
    pricePaise: 249900,
    stock: 0,
    icon: '🔊',
  },
];