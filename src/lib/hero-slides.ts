import type { Product } from './types';

export function heroSlides(products: Product[]) {
  const preferred = ['pagne10', 'pagne1', 'pagne9', 'pagne11'];
  const available = products.filter(p => p.published !== false && p.photos.length > 0);
  const ordered = [...preferred.flatMap(id => available.filter(p => p.id === id)), ...available.filter(p => !preferred.includes(p.id))];
  return ordered.slice(0, 4).map(product => ({
    id: product.id,
    name: product.name,
    src: (product.photos.find(photo => photo.view === (product.id === 'pagne1' ? 5 : 2)) ?? product.photos[0]).src,
  }));
}
