export type Photo = { src: string; thumbnail: string; view: number; label: string };
export type Product = {
  published?: boolean;
  availability?: 'available' | 'on-order' | 'unavailable' | 'confirm';
  occasions?: string[];
  id: string;
  number: number;
  name: string;
  description: string;
  colors: string[];
  pattern: string;
  accent: string;
  price: number | null;
  unit: string;
  composition: string;
  dimensions: string;
  photos: Photo[];
};
export type BagItem = { id: string; quantity: number };
