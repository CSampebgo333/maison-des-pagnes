import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { t } from '../lib/i18n';
import { asset } from '../lib/assets';
import { imageVariant } from '../lib/images';
import { createSlideshow, observeSlideshow } from '../lib/slideshow';
import { heroSlides } from '../lib/hero-slides';
import type { Product } from '../lib/types';

export default function HeroCarousel({ products }: { products: Product[] }) {
  const slides = useMemo(() => {
    const selected = heroSlides(products);
    return selected.length ? selected : [{ id: 'maison', name: t('Faso Dan Fani'), src: 'pagnes/pagne1-1.webp' }];
  }, [products]);
  const slideKey = slides.map(slide => slide.id + ':' + slide.src).join('|');
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const index = Math.min(current, slides.length - 1);

  useEffect(() => {
    setCurrent(0);
    const slideshow = createSlideshow(slides.length, setCurrent);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const unobserve = observeSlideshow(slideshow, document, motion, () => {});
    return () => {
      slideshow.destroy(); unobserve();
    };
  // A catalogue refresh with the same photos, or a language switch, keeps the
  // current slide and clock; replacing a photo rebuilds the slideshow safely.
  }, [slideKey]);

  return <section className="storefront-hero" aria-labelledby="hero-title">
    <div className="hero-photograph">{slides.map((slide, position) => <div className={`hero-slide${position === index ? ' is-current' : ''}`} key={slide.id + slide.src} aria-hidden={position !== index}>
      <img src={asset(imageVariant(failed.includes(slide.src) ? 'pagnes/pagne1-1.webp' : slide.src).display)} alt={position === index ? failed.includes(slide.src) ? t('Faso Dan Fani') : slide.name : ''} fetchPriority={position === 0 ? 'high' : 'auto'} loading={position === 0 ? 'eager' : 'lazy'} decoding="async" draggable={false} width="1000" height="1333" onError={() => setFailed(old => old.includes(slide.src) ? old : [...old, slide.src])}/>
    </div>)}</div>
    <div className="hero-copy"><p className="eyebrow">{t('LA MAISON DU FASO DAN FANI')}</p><h1 id="hero-title">{t('Des pagnes.')}<br/><em>{t('Une histoire.')}</em></h1><p>{t('Des couleurs qui vous ressemblent, un savoir-faire qui nous rassemble. Découvrez les pagnes de notre boutique familiale au Burkina Faso.')}</p><a className="primary-button" href="#collection">{t('Découvrir la collection ')}<ArrowRight size={18}/></a><span className="hero-signature">{t('Le Faso Dan Fani, une fierté à porter.')}</span></div>
  </section>;
}
