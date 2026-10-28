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
    {
    id: 'mouse',
    name: 'Orbit Wireless Mouse',
    description:
      'A lightweight wireless mouse with adjustable pointer speed.',
    category: 'Workspace',
    pricePaise: 199900,
    stock: 25,
    icon: '🖱️',
  },
  {
    id: 'monitor',
    name: 'Clarity 27-inch Monitor',
    description:
      'A spacious display for coding, debugging, and reviewing test results.',
    category: 'Workspace',
    pricePaise: 1899900,
    stock: 5,
    icon: '🖥️',
  },
  {
    id: 'desk-lamp',
    name: 'Focus LED Desk Lamp',
    description:
      'Adjustable lighting for your workspace and evening study sessions.',
    category: 'Workspace',
    pricePaise: 249900,
    stock: 1,
    icon: '💡',
  },
  {
    id: 'laptop-stand',
    name: 'Elevate Laptop Stand',
    description:
      'A compact stand that raises your laptop to a comfortable viewing height.',
    category: 'Workspace',
    pricePaise: 299900,
    stock: 0,
    icon: '💻',
  },
  {
    id: 'microphone',
    name: 'Studio USB Microphone',
    description:
      'Clear voice recording for demos, meetings, and tutorial videos.',
    category: 'Audio',
    pricePaise: 499900,
    stock: 8,
    icon: '🎙️',
  },
  {
    id: 'earbuds',
    name: 'Pocket Wireless Earbuds',
    description:
      'Compact wireless earbuds with a portable charging case.',
    category: 'Audio',
    pricePaise: 349950,
    stock: 15,
    icon: '🎵',
  },
];