import {t,useLanguage,localeFor} from '../lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, Move } from 'lucide-react';
import type { Product } from '../lib/types';
import { asset } from '../lib/assets';
import { imageVariant, warmImage, canPrefetch } from '../lib/images';
import ProgressiveImage from './ProgressiveImage';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function ProductViewer({ product }: { product: Product }) {
 useLanguage();
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);
  const [dragging, setDragging] = useState(false);
  const photo = product.photos[index];
  const variant = imageVariant(photo.src);
  const displaySrc = zoom > 1 ? photo.src : variant.display;
  useEffect(() => {
    if (!canPrefetch()) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      await warmImage(variant.display);
      for (const offset of [1, -1]) {
        if (cancelled) break;
        const neighbor = product.photos[(index + offset + product.photos.length) % product.photos.length];
        await warmImage(imageVariant(neighbor.src).display);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [index, product, variant.display]);

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); pointers.current.clear(); }, [index, product.id]);
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((value) => clamp(value * Math.exp(-event.deltaY * .0015), 1, 4));
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, []);
  useEffect(() => {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return;
    setPan((value) => ({ x: clamp(value.x, -rect.width * (zoom - 1) / 2, rect.width * (zoom - 1) / 2), y: clamp(value.y, -rect.height * (zoom - 1) / 2, rect.height * (zoom - 1) / 2) }));
  }, [zoom]);

  function previous() { setIndex((value) => (value - 1 + product.photos.length) % product.photos.length); }
  function next() { setIndex((value) => (value + 1) % product.photos.length); }

  return <div className="product-viewer">
    <div className="viewer-stage" ref={stage} style={{ cursor: zoom > 1 ? dragging ? 'grabbing' : 'grab' : 'zoom-in' }}
      onDoubleClick={() => { setZoom(zoom > 1 ? 1 : 2); setPan({ x: 0, y: 0 }); }}
      onPointerDown={(event) => {
        stage.current?.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        setDragging(true);
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()]; pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
        }
      }}
      onPointerMove={(event) => {
        const old = pointers.current.get(event.pointerId);
        if (!old) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()]; const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch.current > 0) setZoom((value) => clamp(value * distance / pinch.current, 1, 4));
          pinch.current = distance;
        } else if (zoom > 1) {
          const rect = stage.current!.getBoundingClientRect();
          setPan((value) => ({ x: clamp(value.x + event.clientX - old.x, -rect.width * (zoom - 1) / 2, rect.width * (zoom - 1) / 2), y: clamp(value.y + event.clientY - old.y, -rect.height * (zoom - 1) / 2, rect.height * (zoom - 1) / 2) }));
        }
      }}
      onPointerUp={(event) => { pointers.current.delete(event.pointerId); if (!pointers.current.size) setDragging(false); pinch.current = 0; }}
      onPointerCancel={(event) => { pointers.current.delete(event.pointerId); setDragging(false); pinch.current = 0; }}>
      <ProgressiveImage key={displaySrc} src={displaySrc} preview={zoom > 1 ? variant.display : variant.thumbnail} alt={`${product.name} — ${photo.label}`} draggable={false} fetchPriority="high" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
      <span className="view-caption">{photo.label}</span>
      <span className="view-counter">{index + 1} / {product.photos.length}</span>
    </div>
    <div className="zoom-toolbar">
      <div className="zoom-group">
        <button className="icon-button" aria-label={t("Dézoomer la photo")} disabled={zoom <= 1} onClick={() => setZoom(clamp(zoom - .5, 1, 4))}><Minus size={16} /></button>
        <label className="zoom-label"><span className="sr-only">{t("Zoom de la photo")}</span><input type="range" min="1" max="4" step=".1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><span>{Math.round(zoom * 100)} %</span></label>
        <button className="icon-button" aria-label={t("Zoomer la photo")} disabled={zoom >= 4} onClick={() => setZoom(clamp(zoom + .5, 1, 4))}><Plus size={16} /></button>
        <button className="icon-button" aria-label={t("Réinitialiser la photo")} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw size={15} /></button>
      </div>
      <span className="zoom-hint"><Move size={13} /> {t(" Glissez la photo agrandie")}</span>
    </div>
    <div className="photo-thumbnails">
      <button className="icon-button" aria-label={t("Photo précédente")} onClick={previous}><ChevronLeft size={18} /></button>
      <div className="thumbnail-scroll">{product.photos.map((item, number) => <button key={item.src} className={`photo-thumbnail ${index === number ? 'is-current' : ''}`} aria-pressed={index === number} aria-label={t("Afficher {0}",item.label)} onPointerEnter={() => { if (canPrefetch()) void warmImage(imageVariant(item.src).display); }} onFocus={() => { if (canPrefetch()) void warmImage(imageVariant(item.src).display); }} onClick={() => setIndex(number)}><img src={asset(imageVariant(item.src).thumbnail)} alt="" decoding="async" /><span>{number + 1}</span></button>)}</div>
      <button className="icon-button" aria-label={t("Photo suivante")} onClick={next}><ChevronRight size={18} /></button>
    </div>
  </div>;
}
