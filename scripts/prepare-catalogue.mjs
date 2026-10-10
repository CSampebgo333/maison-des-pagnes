import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { groupPhotos, makeCatalogue } from './catalogue-core.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = await readdir(resolve(root, 'public/pagnes'));
const metadata = JSON.parse(await readFile(resolve(root, 'config/pagnes.json'), 'utf8'));
const shop = JSON.parse(await readFile(resolve(root, 'config/boutique.json'), 'utf8'));
const catalogue = makeCatalogue(groupPhotos(files), metadata);
if (catalogue.some((p) => p.price !== null)) {
  if (!shop.currency) throw new Error('Renseignez une devise ISO (ex. XOF, GHS, EUR) dans config/boutique.json avant d’ajouter des prix.');
  new Intl.NumberFormat(shop.locale, { style: 'currency', currency: shop.currency }).format(0);
}
for (const product of catalogue) {
  for (const photo of product.photos) {
    const name = photo.src.split('/').at(-1);
    try { await access(resolve(root, 'public/pagnes/apercus', name)); photo.thumbnail = `pagnes/apercus/${name}`; } catch { /* L’original reste utilisable. */ }
  }
}
await writeFile(resolve(root, 'src/catalogue.json'), JSON.stringify(catalogue, null, 2) + '\n');
console.log(`Catalogue : ${catalogue.length} pagnes, ${catalogue.reduce((total, product) => total + product.photos.length, 0)} photos.`);
const unused = Object.keys(metadata).filter((id) => !catalogue.some((p) => p.id === id));
if (unused.length) console.warn(`Métadonnées sans photos, non affichées : ${unused.join(', ')}`);
