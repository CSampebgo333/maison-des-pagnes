import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { t } from '../lib/i18n';
import { asset } from '../lib/assets';
import { imageVariant } from '../lib/images';
import { createSlideshow } from '../lib/slideshow';
import { heroSlides } from '../lib/hero-slides';
import type { Product } from '../lib/types';

export default function HeroCarousel({ products }: { products: Product[] }) {
  const slides = useMemo(() => {
    const selected = heroSlides(products);
    return selected.length ? selected : [{ id: 'maison', name: t('Faso Dan Fani'), src: 'pagnes/pagne10-2.webp' }];
  }, [products]);
  const slideKey = slides.map(slide => slide.id + ':' + slide.src).join('|');
  const [current, setCurrent] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [announcement, setAnnouncement] = useState('');
  const [failed, setFailed] = useState<string[]>([]);
  const region = useRef<HTMLElement>(null);
  const controls = useRef<ReturnType<typeof createSlideshow> | null>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const hovering = useRef(false);
  const paused = useRef(userPaused);
  paused.current = userPaused;
  const index = Math.min(current, slides.length - 1);

  useEffect(() => {
    setCurrent(0);
    const slideshow = createSlideshow(slides.length, setCurrent);
    controls.current = slideshow;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => { setReducedMotion(motion.matches); slideshow.pause('motion', motion.matches); };
    const visibility = () => slideshow.pause('hidden', document.hidden);
    preference(); visibility();
    slideshow.pause('user', paused.current);
    slideshow.pause('pointer', hovering.current);
    slideshow.pause('focus', Boolean(region.current?.contains(document.activeElement)));
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      slideshow.pause('outside', !entries[0].isIntersecting);
    }) : null;
    if (region.current) observer?.observe(region.current);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', preference);
    return () => {
      slideshow.destroy(); observer?.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', preference);
      controls.current = null;
    };
  // A catalogue refresh with the same photos, or a language switch, keeps the
  // current slide and clock; replacing a photo rebuilds the slideshow safely.
  }, [slideKey]);

  function navigate(direction: number) {
    if (direction < 0) controls.current?.previous(); else controls.current?.next();
    setAnnouncement(t('Photo {0} sur {1}', ((index + direction + slides.length) % slides.length) + 1, slides.length));
  }
  return <section className={`storefront-hero${userPaused ? ' is-paused' : ''}`} ref={region} aria-labelledby="hero-title" aria-roledescription={t('Carrousel')}
    onPointerEnter={event => { if (event.pointerType !== 'touch') { hovering.current = true; controls.current?.pause('pointer', true); } }}
    onPointerLeave={() => { hovering.current = false; controls.current?.pause('pointer', false); }}
    onFocusCapture={() => controls.current?.pause('focus', true)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) controls.current?.pause('focus', false); }}
    onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); navigate(event.key === 'ArrowLeft' ? -1 : 1); } }}
    onPointerDown={event => { gesture.current = null; if (event.pointerType === 'touch' && !(event.target as Element).closest('a,button')) { gesture.current = { x: event.clientX, y: event.clientY }; controls.current?.pause('gesture', true); } }}
    onPointerCancel={() => { gesture.current = null; controls.current?.pause('gesture', false); }}
    onPointerUp={event => { const start = gesture.current; gesture.current = null; controls.current?.pause('gesture', false); if (!start) return; const dx = event.clientX - start.x, dy = event.clientY - start.y; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) navigate(dx < 0 ? 1 : -1); }}>
    <div className="hero-photograph">{slides.map((slide, position) => <div className={`hero-slide${position === index ? ' is-current' : ''}`} key={slide.id + slide.src} aria-hidden={position !== index}>
      <img src={asset(imageVariant(failed.includes(slide.src) ? 'pagnes/pagne10-2.webp' : slide.src).display)} alt={position === index ? failed.includes(slide.src) ? t('Faso Dan Fani') : slide.name : ''} fetchPriority={position === 0 ? 'high' : 'auto'} loading={position === 0 ? 'eager' : 'lazy'} decoding="async" width="1000" height="1333" onError={() => setFailed(old => old.includes(slide.src) ? old : [...old, slide.src])}/>
    </div>)}</div>
    <div className="hero-copy"><p className="eyebrow">{t('LA MAISON DU FASO DAN FANI')}</p><h1 id="hero-title">{t('Des pagnes.')}<br/><em>{t('Une histoire.')}</em></h1><p>{t('Des couleurs qui vous ressemblent, un savoir-faire qui nous rassemble. Découvrez les pagnes de notre boutique familiale au Burkina Faso.')}</p><a className="primary-button" href="#collection">{t('Découvrir la collection ')}<ArrowRight size={18}/></a><span className="hero-signature">{t('Le Faso Dan Fani, une fierté à porter.')}</span></div>
    {slides.length > 1 && <div className="hero-carousel-controls" role="group" aria-label={t('Parcourir les photos d’accueil')}>
      <button onClick={() => navigate(-1)} aria-label={t('Photo précédente')}><ArrowLeft size={18}/></button>
      <div className="hero-pagination">{slides.map((slide, position) => <button key={slide.id} onClick={() => { controls.current?.goTo(position); setAnnouncement(t('Photo {0} sur {1}', position + 1, slides.length)); }} aria-label={t('Afficher la photo {0} : {1}', position + 1, slide.name)} aria-current={position === index ? 'true' : undefined}><span/></button>)}</div>
      <button onClick={() => navigate(1)} aria-label={t('Photo suivante')}><ArrowRight size={18}/></button>
      <button disabled={reducedMotion} aria-pressed={userPaused || reducedMotion} aria-label={reducedMotion ? t('Animation automatique désactivée : mouvement réduit') : userPaused ? t('Reprendre le défilement des photos') : t('Mettre les photos en pause')} onClick={() => { setUserPaused(!userPaused); controls.current?.pause('user', !userPaused); }}>{userPaused || reducedMotion ? <Play size={16}/> : <Pause size={16}/>}</button>
    </div>}
    <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
  </section>;
}
