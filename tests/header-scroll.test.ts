import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHeaderScroll } from '../src/lib/header-scroll.ts';

test('La navigation reste visible sur l’accueil, se cache en descendant et revient sur fond blanc en remontant', () => {
  const update = createHeaderScroll();
  assert.deepEqual(update(0, 100), { hidden: false, solid: false });
  assert.deepEqual(update(60, 100), { hidden: false, solid: true });
  assert.deepEqual(update(200, 100), { hidden: true, solid: true });
  assert.deepEqual(update(180, 100), { hidden: false, solid: true });
  assert.deepEqual(update(0, 100), { hidden: false, solid: false });
});

test('Les micro-mouvements du pavé tactile ne font pas clignoter la navigation', () => {
  const update = createHeaderScroll();
  update(400, 100);
  assert.equal(update(399, 100).hidden, true);
  assert.equal(update(401, 100).hidden, true);
  assert.equal(update(397, 100).hidden, true);
  assert.equal(update(390, 100).hidden, false);
  assert.equal(update(391, 100).hidden, false);
  assert.equal(update(394, 100).hidden, false);
});

test('Le clavier garde les contrôles visibles et un en-tête mobile plus haut garde son espace', () => {
  const update = createHeaderScroll();
  assert.equal(update(180, 220).hidden, false);
  assert.equal(update(600, 220).hidden, true);
  assert.equal(update(610, 220, true).hidden, false);
  assert.equal(update(640, 220, true).hidden, false);
  assert.equal(update(-20, 220).solid, false);
});
