import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSlideshow, observeSlideshow, SLIDE_INTERVAL } from '../src/lib/slideshow.ts';
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

test('La pause explicite, l’onglet masqué et la réduction du mouvement restent indépendants', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const seen: number[] = [], slideshow = createSlideshow(5, index => seen.push(index));
  for (const reason of ['user', 'hidden', 'motion'] as const) slideshow.pause(reason, true);
  for (const reason of ['hidden', 'motion'] as const) slideshow.pause(reason, false);
  t.mock.timers.tick(24000); assert.deepEqual(seen, []);
  slideshow.pause('user', false); t.mock.timers.tick(7999); assert.deepEqual(seen, []);
  t.mock.timers.tick(1); assert.deepEqual(seen, [1]); slideshow.destroy();
});

test('Survol, focus, clics et défilement laissent le diaporama avancer sans remettre son compteur à zéro', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const seen: number[] = [], slideshow = createSlideshow(5, index => seen.push(index));
  const page = Object.assign(new EventTarget(), { hidden: false });
  const motion = Object.assign(new EventTarget(), { matches: false });
  const stop = observeSlideshow(slideshow, page, motion, () => {});
  t.mock.timers.tick(7000);
  for (const type of ['pointerenter', 'pointermove', 'focusin', 'click', 'scroll', 'pointerdown']) page.dispatchEvent(new Event(type));
  t.mock.timers.tick(1000); assert.deepEqual(seen, [1]);
  page.hidden = true; page.dispatchEvent(new Event('visibilitychange'));
  t.mock.timers.tick(16000); assert.deepEqual(seen, [1]);
  page.hidden = false; page.dispatchEvent(new Event('visibilitychange'));
  t.mock.timers.tick(8000); assert.deepEqual(seen, [1, 2]);
  motion.matches = true; motion.dispatchEvent(new Event('change'));
  t.mock.timers.tick(16000); assert.deepEqual(seen, [1, 2]);
  stop(); slideshow.destroy();
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
  assert.deepEqual(slides.map(s => s.id), ['pagne1', 'pagne2', 'pagne3', 'pagne6', 'pagne7']);
  assert.deepEqual(slides.map(s => s.src), ['pagnes/pagne1-1.webp', 'pagnes/pagne2-1.webp', 'pagnes/pagne3-1.webp', 'pagnes/pagne6-1.webp', 'pagnes/pagne7-1.webp']);
  const changed = catalogue.map(p => p.id === 'pagne1' ? { ...p, photos: [{ ...p.photos[0], src: 'nouvelle-photo.jpg' }] } : p).map(p => p.id === 'pagne2' ? { ...p, published: false } : p);
  const updated = heroSlides(changed);
  assert.equal(updated.length, 4); assert.ok(!updated.some(s => s.id === 'pagne2'));
  assert.equal(updated.find(s => s.id === 'pagne1')?.src, 'nouvelle-photo.jpg');
  assert.deepEqual(heroSlides([]), []);
});
