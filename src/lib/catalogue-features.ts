import type { Product } from './types';
export const occasions = ['Mariage traditionnel', 'Cérémonie', 'Fête en famille', 'Quotidien', 'Rencontre professionnelle', 'Cadeau'];
export const availabilityLabels = { available: 'Disponible en stock', 'on-order': 'Sur commande', unavailable: 'Indisponible pour le moment', confirm: 'Disponibilité à confirmer' };
export function availabilityLabel(product: Product) { return availabilityLabels[product.availability ?? 'confirm']; }
export function productOccasions(product: Product) {
 if(product.occasions) return product.occasions;
 const text=product.description.toLowerCase();
 return occasions.filter((_,i)=>[/mariage/,/cérémonie/,/famille|fête/,/quotidien/,/professionnel/,/cadeau/][i].test(text));
}
export function readFavorites(raw: string|null): string[] { try { const value:unknown=JSON.parse(raw??'[]'); return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(id)))].slice(0,200):[]; } catch {return [];} }
