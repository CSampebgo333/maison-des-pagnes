import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findProducts, readBag } from '../src/lib/catalogue.ts';
import type { Product } from '../src/lib/types.ts';

const products = JSON.parse(readFileSync(new URL('../src/catalogue.json', import.meta.url), 'utf8')) as Product[];
test('La recherche combine les mots et ignore les accents et la casse', () => {
  assert.deepEqual(findProducts(products, '  BLEU   rayures ').map((p) => p.id), ['pagne2', 'pagne3', 'pagne4', 'pagne6', 'pagne8']);
  assert.deepEqual(findProducts(products, 'lavande blanc').map((p) => p.id), ['pagne1']);
  assert.equal(findProducts(products, 'détail').length, findProducts(products, 'DETAIL').length);
  assert.deepEqual(findProducts(products, 'bleu violet').map(p => p.id), ['pagne6']);
});
test('Le filtre couleur et la recherche se combinent sans résultats incohérents', () => {
  assert.equal(findProducts(products, 'rayures', 'Bleu')[0].id, 'pagne2');
  assert.equal(findProducts(products, 'lavande', 'Bleu').length, 0);
  assert.deepEqual(findProducts(products, '', '', 'name').map((p) => p.id), ['pagne7', 'pagne12', 'pagne10', 'pagne8', 'pagne5', 'pagne2', 'pagne9', 'pagne4', 'pagne11', 'pagne3', 'pagne1', 'pagne6']);
});
test('Une sélection corrompue ou liée à des produits retirés est nettoyée', () => {
  assert.deepEqual(readBag('not-json', products), []);
  assert.deepEqual(readBag('{}', products), []);
  assert.deepEqual(readBag(JSON.stringify([{ id: 'pagne1', quantity: 2 }, { id: 'pagne1', quantity: 3 }, { id: 'absent', quantity: 1 }, { id: 'pagne2', quantity: -1 }, { id: 'pagne2', quantity: '1' }]), products), [{ id: 'pagne1', quantity: 5 }]);
  assert.deepEqual(readBag('[{"id":"pagne2","quantity":200}]', products), [{ id: 'pagne2', quantity: 99 }]);
});
