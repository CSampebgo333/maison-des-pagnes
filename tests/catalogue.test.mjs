import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { groupPhotos, makeCatalogue } from '../scripts/catalogue-core.mjs';

test('Les 12 pagnes et leurs 5 vues sont regroupés et triés numériquement', () => {
  const names = [];
  for (let n = 12; n >= 1; n--) for (let v = 5; v >= 1; v--) names.push(`pagne${n}-${v}.png`);
  names.push('pagne1-1 - Copy.png', 'README.txt', 'pagne2-2 - Copy.png');
  const groups = groupPhotos(names);
  assert.equal(groups.length, 12);
  assert.deepEqual(groups.map((g) => g.number), Array.from({ length: 12 }, (_, i) => i + 1));
  for (const group of groups) assert.deepEqual(group.photos.map((p) => p.view), [1, 2, 3, 4, 5]);
});

test('Deux extensions pour une même vue sont signalées avant la génération', () => {
  assert.throws(() => groupPhotos(['pagne1-1.png', 'pagne1-1.webp']), /même vue/);
});

test('La collection complète contient douze produits, leurs vues principales et soixante photos présentes', async () => {
  const raw = JSON.parse(await readFile(new URL('../src/catalogue.json', import.meta.url), 'utf8'));
  assert.equal(raw.length, 12);
  assert.equal(raw.reduce((n, p) => n + p.photos.length, 0), 60);
  const files = await readdir(new URL('../public/pagnes/', import.meta.url));
  for (const product of raw) {
    assert.equal(product.price, 12000);
    assert.equal(product.photos[0].view, 1);
    assert.equal(product.photos.length, 5);
    for (const photo of product.photos) {
      assert.ok(files.includes(photo.src.split('/').at(-1)));
      assert.ok((await readFile(new URL(`../public/${photo.thumbnail}`, import.meta.url))).length > 0);
    }
  }
});

test('Les pagnes ajoutés sans fiche ont un nom de référence sans prix inventé', () => {
  const [product] = makeCatalogue(groupPhotos(['pagne12-3.jpg', 'pagne12-1.jpg']), {});
  assert.equal(product.id, 'pagne12');
  assert.equal(product.name, 'Pagne 12');
  assert.equal(product.price, null);
  assert.deepEqual(product.photos.map((p) => p.view), [1, 3]);
  assert.throws(() => makeCatalogue(groupPhotos(['pagne12-1.jpg']), { pagne12: { price: -1 } }), /Prix invalide/);
});
