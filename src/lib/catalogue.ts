import type { Product, BagItem } from './types.ts';

export function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function findProducts(products: Product[], query: string, color = '', sort = 'collection') {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  const result = products.filter((product) => {
    const haystack = normalize([product.id, product.name, product.description, product.pattern, ...product.colors].join(' '));
    return tokens.every((token) => haystack.includes(token)) && (!color || product.colors.includes(color));
  });
  if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  else if (sort === 'price') result.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || a.number - b.number);
  else result.sort((a, b) => a.number - b.number);
  return result;
}

export function readBag(raw: string | null, products: Product[]): BagItem[] {
  try {
    const items: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(items)) return [];
    const unique = new Map<string, number>();
    for (const item of items) {
      if (item && typeof item.id === 'string' && products.some((p) => p.id === item.id) && Number.isInteger(item.quantity) && item.quantity > 0) {
        unique.set(item.id, Math.min(99, (unique.get(item.id) ?? 0) + item.quantity));
      }
    }
    return [...unique].map(([id, quantity]) => ({ id, quantity }));
  } catch { return []; }
}

export const photoLabels: Record<number, string> = {
  1: 'Vue d’ensemble', 2: 'Pagne plié', 3: 'Tissu drapé', 4: 'Détail du motif', 5: 'Autre vue',
};
