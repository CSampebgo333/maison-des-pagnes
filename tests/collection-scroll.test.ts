import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionPosition, collectionPageTarget, collectionDrag } from '../src/lib/collection-scroll.ts';

const regular = { left: 0, viewport: 948, card: 300, gap: 24, count: 12 };

test('La collection affiche trois pagnes par groupe, quatre sur grand écran et deux sur téléphone', () => {
  assert.deepEqual([collectionPosition(regular).capacity, collectionPosition({ ...regular, viewport: 1272 }).capacity, collectionPosition({ ...regular, viewport: 312, card: 150, gap: 12 }).capacity], [3, 4, 2]);
  const start = collectionPosition(regular);
  assert.deepEqual([start.first, start.last, start.pages, start.previous, start.next], [1, 3, 4, false, true]);
  const next = collectionPosition({ ...regular, left: start.stride });
  assert.deepEqual([next.first, next.last, next.previous, next.next], [2, 4, true, true]);
});

test('Le dernier groupe incomplet atteint tous les pagnes sans déborder et garde son point actif', () => {
  const layout = { ...regular, count: 10 };
  const target = collectionPageTarget(3, layout);
  const end = collectionPosition({ ...layout, left: target });
  assert.deepEqual([end.first, end.last, end.page, end.pages, end.previous, end.next], [8, 10, 3, 4, true, false]);
  assert.equal(collectionPageTarget(100, layout), target);
  assert.equal(collectionPageTarget(-1, layout), 0);
  for (let page = 0; page < end.pages; page++) assert.equal(collectionPosition({ ...layout, left: collectionPageTarget(page, layout) }).page, page);
});

test('Les petites sélections et les résultats vides désactivent les déplacements inutiles', () => {
  const few = collectionPosition({ ...regular, count: 2 });
  assert.deepEqual([few.first, few.last, few.pages, few.previous, few.next], [1, 2, 1, false, false]);
  const empty = collectionPosition({ ...regular, count: 0 });
  assert.deepEqual([empty.first, empty.last, empty.pages, empty.previous, empty.next], [0, 0, 0, false, false]);
});

test('Un redimensionnement ou une liste raccourcie recalcule la position et les limites', () => {
  const oldEnd = collectionPosition({ ...regular, left: 99999 });
  assert.deepEqual([oldEnd.first, oldEnd.last], [10, 12]);
  const wide = collectionPosition({ ...regular, viewport: 1272, left: oldEnd.max });
  assert.deepEqual([wide.first, wide.last, wide.page, wide.pages, wide.next], [9, 12, 2, 3, false]);
  const filtered = collectionPosition({ ...regular, count: 4, left: oldEnd.max });
  assert.deepEqual([filtered.first, filtered.last, filtered.next], [2, 4, false]);
});

test('Le glissement à la souris distingue un clic, un mouvement horizontal et un geste vertical', () => {
  const start = { x: 100, y: 80, left: 300 };
  assert.equal(collectionDrag(start, 104, 80).dragging, false);
  assert.equal(collectionDrag(start, 120, 140).dragging, false);
  assert.deepEqual(collectionDrag(start, 60, 82), { dragging: true, left: 340 });
  assert.deepEqual(collectionDrag(start, 500, 82), { dragging: true, left: 0 });
});
