export type Product = {
  id: string;
  name: string;
  description: string;
  category: 'Workspace' | 'Audio';
  pricePaise: number;
  stock: number;
  icon: string;
};