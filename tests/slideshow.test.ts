import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSlideshow, SLIDE_INTERVAL } from '../src/lib/slideshow.ts';
import { heroSlides } from '../src/lib/hero-slides.ts';
import { readFileSync } from 'node:fs';
import type { Product } from '../src/lib/types.ts';

const catalogue = JSON.parse(readFileSync(new URL('../src/catalogue.json', import.meta.url), 'utf8')) as Product[];

test('Les photos avancent toutes les huit secondes et rebouclent sur la première', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const seen: number[] = [], slideshow = createSlideshow(4, index => seen.push(index));
  assert.equal(SLIDE_INTERVAL, 8000);
  t.mock.timers.tick(7999); assert.deepEqual(seen, []);
  t.mock.timers.tick(1); assert.deepEqual(seen, [1]);
  for (let i = 0; i < 3; i++) t.mock.timers.tick(8000);
  assert.deepEqual(seen, [1, 2, 3, 0]); slideshow.destroy();
});

test('Pause utilisateur, survol, focus, onglet masqué et réduction du mouvement restent indépendants', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const seen: number[] = [], slideshow = createSlideshow(4, index => seen.push(index));
  for (const reason of ['user', 'pointer', 'focus', 'hidden', 'motion', 'outside']) slideshow.pause(reason, true);
  for (const reason of ['pointer', 'focus', 'hidden', 'motion', 'outside']) slideshow.pause(reason, false);
  t.mock.timers.tick(24000); assert.deepEqual(seen, []);
  slideshow.pause('user', false); t.mock.timers.tick(7999); assert.deepEqual(seen, []);
  t.mock.timers.tick(1); assert.deepEqual(seen, [1]); slideshow.destroy();
});

test('Les flèches et points restent utilisables en pause et redémarrent un intervalle complet', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const seen: number[] = [], slideshow = createSlideshow(4, index => seen.push(index));
  t.mock.timers.tick(7000); slideshow.goTo(2);
  t.mock.timers.tick(1000); assert.deepEqual(seen, [2]);
  t.mock.timers.tick(7000); assert.deepEqual(seen, [2, 3]);
  slideshow.pause('motion', true); slideshow.next(); slideshow.previous();
  t.mock.timers.tick(16000); assert.deepEqual(seen, [2, 3, 0, 3]); slideshow.destroy();
});

test('Fermer le composant annule tout changement différé, et une seule photo reste statique', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const seen: number[] = [], slideshow = createSlideshow(4, index => seen.push(index));
  slideshow.destroy(); slideshow.next(); slideshow.pause('user', false);
  const single = createSlideshow(1, index => seen.push(index));
  t.mock.timers.tick(80000); assert.deepEqual(seen, []); single.destroy();
});

test('Le carrousel utilise les photos actuelles du catalogue, sans pagne masqué ou retiré', () => {
  const slides = heroSlides(catalogue);
  assert.deepEqual(slides.map(s => s.id), ['pagne10', 'pagne1', 'pagne9', 'pagne11']);
  assert.equal(slides[1].src, 'pagnes/pagne1-5.webp');
  const changed = catalogue.map(p => p.id === 'pagne1' ? { ...p, photos: [{ ...p.photos[0], src: 'nouvelle-photo.jpg' }] } : p).map(p => p.id === 'pagne10' ? { ...p, published: false } : p);
  const updated = heroSlides(changed);
  assert.equal(updated.length, 4); assert.ok(!updated.some(s => s.id === 'pagne10'));
  assert.equal(updated.find(s => s.id === 'pagne1')?.src, 'nouvelle-photo.jpg');
  assert.deepEqual(heroSlides([]), []);
});
