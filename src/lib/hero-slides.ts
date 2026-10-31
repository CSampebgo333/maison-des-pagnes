import type { Product } from './types';

export function heroSlides(products: Product[]) {
  const preferred = ['pagne1', 'pagne2', 'pagne3', 'pagne6', 'pagne7'];
  const available = products.filter(p => p.published !== false && p.photos.length > 0);
  const ordered = preferred.flatMap(id => available.filter(p => p.id === id));
  return ordered.map(product => ({
    id: product.id,
    name: product.name,
    src: (product.photos.find(photo => photo.view === 1) ?? product.photos[0]).src,
  }));
}
