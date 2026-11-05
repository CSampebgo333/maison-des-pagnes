import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { t, useLanguage } from '../lib/i18n';
import {collectionPath} from '../lib/product-seo.js';
import {commerceCopy} from '../lib/commerce-copy.js';
import { asset } from '../lib/assets';
import { imageVariant, warmImage, canPrefetch } from '../lib/images';
import { createSlideshow, observeSlideshow, SLIDE_INTERVAL } from '../lib/slideshow';
import { heroSlides } from '../lib/hero-slides';
import type { Product } from '../lib/types';

export default function HeroCarousel({ products }: { products: Product[] }) {
  const language=useLanguage(),copy=commerceCopy(language);
  const slides = useMemo(() => {
    const selected = heroSlides(products);
    return selected.length ? selected : [{ id: 'maison', name: t('Faso Dan Fani'), src: 'pagnes/pagne1-1.webp' }];
  }, [products]);
  const slideKey = slides.map(slide => slide.id + ':' + slide.src).join('|');
  const [current, setCurrent] = useState(0);
  const [seen,setSeen]=useState<string[]>([]);
  const [motionPaused, setMotionPaused] = useState(false);
  const controls = useRef<ReturnType<typeof createSlideshow> | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const index = Math.min(current, slides.length - 1);

  useEffect(()=>{setSeen(old=>[slides[index].id,...old.filter(id=>id!==slides[index].id)].slice(0,2));},[index,slideKey]);
  useEffect(()=>{if(motionPaused||!canPrefetch()||document.hidden)return;const next=slides[(index+1)%slides.length];const timer=setTimeout(()=>void warmImage(imageVariant(next.src).display),1200);return()=>clearTimeout(timer);},[index,slideKey,motionPaused]);

  useEffect(() => {
    setCurrent(0);
    const slideshow = createSlideshow(slides.length, setCurrent, 'animation');
    controls.current = slideshow;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const unobserve = observeSlideshow(slideshow, document, motion, () => {}, setMotionPaused);
    return () => {
      slideshow.destroy(); unobserve(); controls.current = null;
    };
  // A catalogue refresh with the same photos, or a language switch, keeps the
  // current slide and clock; replacing a photo rebuilds the slideshow safely.
  }, [slideKey]);

  return <section className={`storefront-hero${motionPaused ? ' is-motion-paused' : ''}`} aria-labelledby="hero-title" style={{'--hero-slide-duration':`${SLIDE_INTERVAL}ms`} as CSSProperties}>
    <div className="hero-photograph">{slides.map((slide, position) => <div className={`hero-slide${position === index ? ' is-current' : ''}`} key={slide.id + slide.src} aria-hidden={position !== index}>
      {(position===index||seen.includes(slide.id))&&<picture><img src={asset(imageVariant(failed.includes(slide.src) ? 'pagnes/pagne1-1.webp' : slide.src).display)} srcSet={`${asset(imageVariant(failed.includes(slide.src)?'pagnes/pagne1-1.webp':slide.src).scene)} 650w, ${asset(imageVariant(failed.includes(slide.src)?'pagnes/pagne1-1.webp':slide.src).display)} 1000w`} sizes="(max-width:900px) 100vw, 60vw" alt={position === index ? failed.includes(slide.src) ? t('Faso Dan Fani') : slide.name : ''} fetchPriority={position === 0 ? 'high' : 'auto'} loading={position === 0 ? 'eager' : 'lazy'} decoding="async" draggable={false} onAnimationEnd={event => { if (['hero-fit-in','hero-mobile-reveal'].includes(event.animationName) && position === index) controls.current?.finishAnimation(); }} width="1000" height="1333" onError={() => setFailed(old => old.includes(slide.src) ? old : [...old, slide.src])}/></picture>}
    </div>)}</div>
    <div className="hero-copy"><h1 id="hero-title">{copy.heading}<br/><em>{copy.highlight}</em></h1><p className="hero-intro-desktop">{copy.intro}</p><p className="hero-intro-mobile">{t("Découvrez nos pagnes Faso Dan Fani, leurs motifs et leurs prix. Préparez votre commande auprès de notre boutique familiale à Bobo-Dioulasso.")}</p><a className="primary-button" href={collectionPath(language)}>{copy.cta}<ArrowRight size={18}/></a><span className="hero-signature">{t('Le Faso Dan Fani, une fierté à porter.')}</span></div>
  </section>;
}
