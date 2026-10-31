export type CollectionGeometry = { left: number; viewport: number; card: number; gap: number; count: number };

export function collectionPosition({ left, viewport, card, gap, count }: CollectionGeometry) {
  const stride = Math.max(1, card + gap);
  const capacity = card > 0 ? Math.max(1, Math.round((viewport + gap) / stride)) : 3;
  const max = Math.max(0, count * stride - gap - viewport);
  const offset = Math.min(max, Math.max(0, left));
  const pages = Math.ceil(count / capacity);
  const index = Math.min(Math.max(0, count - capacity), Math.max(0, Math.round(offset / stride)));
  return {
    stride, capacity, max, index, pages,
    page: max > 0 && offset >= max - 2 ? Math.max(0, pages - 1) : Math.floor(index / capacity),
    first: count ? index + 1 : 0,
    last: Math.min(count, index + capacity),
    previous: offset > 2,
    next: offset < max - 2,
  };
}

export function collectionPageTarget(page: number, geometry: CollectionGeometry) {
  const position = collectionPosition(geometry);
  return Math.max(0, Math.min(position.max, page * position.capacity * position.stride));
}

export function collectionDrag(start: { x: number; y: number; left: number }, x: number, y: number) {
  const dx = x - start.x, dy = y - start.y;
  return { dragging: Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy), left: Math.max(0, start.left - dx) };
}
