import { Children, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { t } from '../lib/i18n';
import { collectionPosition, collectionPageTarget, collectionDrag, type CollectionGeometry } from '../lib/collection-scroll';

export default function CollectionCarousel({ children, resetKey }: { children: ReactNode; resetKey: string }) {
  const items = Children.toArray(children), count = items.length;
  const track = useRef<HTMLDivElement>(null);
  const id = useId();
  const [position, setPosition] = useState(() => collectionPosition({ left: 0, viewport: 0, card: 0, gap: 0, count }));
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; left: number; active: boolean } | null>(null);
  const blockClick = useRef(false);
  const unblock = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function geometry(): CollectionGeometry {
    const row = track.current;
    const card = row?.firstElementChild as HTMLElement | null;
    return { left: row?.scrollLeft ?? 0, viewport: row?.clientWidth ?? 0, card: card?.getBoundingClientRect().width ?? 0, gap: row ? parseFloat(getComputedStyle(row).columnGap) || 0 : 0, count };
  }
  function refresh() {
    const next = collectionPosition(geometry());
    setPosition(old => JSON.stringify(old) === JSON.stringify(next) ? old : next);
  }
  function scroll(left: number, instant = false) {
    track.current?.scrollTo({ left, behavior: instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function move(direction: number) {
    const layout = geometry(), current = collectionPosition(layout);
    scroll(Math.max(0, Math.min(current.max, (Math.round(layout.left / current.stride) + direction) * current.stride)));
  }
  function endDrag(pointerId?: number) {
    const active = drag.current?.active;
    drag.current = null; setDragging(false);
    if (pointerId !== undefined && track.current?.hasPointerCapture(pointerId)) track.current.releasePointerCapture(pointerId);
    if (active) {
      blockClick.current = true;
      clearTimeout(unblock.current);
      unblock.current = setTimeout(() => { blockClick.current = false; }, 0);
    }
  }
  useEffect(() => {
    const row = track.current;
    if (!row) return;
    // Reset after search, sorting or favourites change, even when the number of
    // results stays the same. Each row measures and scrolls independently.
    row.scrollTo({ left: 0, behavior: 'instant' }); refresh();
    row.addEventListener('scroll', refresh, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refresh) : null;
    observer?.observe(row);
    if (row.firstElementChild) observer?.observe(row.firstElementChild);
    window.addEventListener('resize', refresh);
    return () => { row.removeEventListener('scroll', refresh); observer?.disconnect(); window.removeEventListener('resize', refresh); clearTimeout(unblock.current); };
  }, [count, resetKey]);

  return <div className="collection-carousel" role="region" aria-roledescription={t('Carrousel')} aria-label={t('Parcourir la collection')}>
    <div className="collection-carousel-heading"><p id={id + '-hint'}>{t('Faites glisser pour découvrir les autres pagnes.')}</p><div className="collection-arrows">
      <button onClick={() => move(-1)} disabled={!position.previous} aria-label={t('Pagnes précédents')} aria-controls={id}><ArrowLeft size={20}/></button>
      <button onClick={() => move(1)} disabled={!position.next} aria-label={t('Pagnes suivants')} aria-controls={id}><ArrowRight size={20}/></button>
    </div></div>
    <div id={id} ref={track} className={`product-grid collection-track${dragging ? ' is-dragging' : ''}`} role="list" tabIndex={0} aria-label={t('Collection de pagnes')} aria-describedby={id + '-hint'}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (event.key === 'Home') scroll(0);
          else if (event.key === 'End') scroll(collectionPosition(geometry()).max);
          else move(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
      onFocusCapture={event => {
        const card = (event.target as HTMLElement).closest<HTMLElement>('.collection-slide'), row = track.current;
        if (!card || !row) return;
        const bounds = card.getBoundingClientRect(), viewport = row.getBoundingClientRect();
        if (bounds.left < viewport.left) scroll(row.scrollLeft + bounds.left - viewport.left, true);
        else if (bounds.right > viewport.right) scroll(row.scrollLeft + bounds.right - viewport.right, true);
      }}
      onDragStart={event => event.preventDefault()}
      onPointerDown={event => {
        if (event.pointerType === 'touch' || event.button !== 0 || (event.target as HTMLElement).closest('.favorite-heart,.product-add,.product-quick-view')) return;
        clearTimeout(unblock.current); blockClick.current = false;
        drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, active: false };
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start) return;
        if (event.buttons === 0) { endDrag(event.pointerId); return; }
        const next = collectionDrag(start, event.clientX, event.clientY);
        if (next.dragging || start.active) {
          event.preventDefault();
          if (!start.active) { start.active = true; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }
          event.currentTarget.scrollLeft = next.left;
        }
      }}
      onPointerLeave={() => { if (!drag.current?.active) drag.current = null; }}
      onPointerUp={event => endDrag(event.pointerId)}
      onPointerCancel={event => endDrag(event.pointerId)}
      onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
      onClickCapture={event => { if (blockClick.current || drag.current?.active) { event.preventDefault(); event.stopPropagation(); } }}>
      {items.map((item, index) => <div className="collection-slide" role="listitem" key={(item as { key?: string }).key ?? index}>{item}</div>)}
    </div>
    <div className="collection-carousel-footer"><p role="status" aria-live="polite">{t('Pagnes {0} à {1} sur {2}', position.first, position.last, count)}</p>
      {position.pages > 1 && <div className="collection-pagination" role="group" aria-label={t('Pages de la collection')}>{Array.from({ length: position.pages }, (_, page) => <button key={page} aria-label={t('Afficher la page {0} de la collection', page + 1)} aria-current={page === position.page ? 'page' : undefined} aria-controls={id} onClick={() => scroll(collectionPageTarget(page, geometry()))}><span/></button>)}</div>}
    </div>
  </div>;
}
