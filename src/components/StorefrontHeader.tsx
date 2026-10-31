import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createHeaderScroll } from '../lib/header-scroll';

export default function StorefrontHeader({ children }: { children: ReactNode }) {
  const header = useRef<HTMLElement>(null);
  const [state, setState] = useState({ hidden: false, solid: false });
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const update = createHeaderScroll();
    let height = element.getBoundingClientRect().height;
    let frame = 0;
    function refresh() {
      const next = update(window.scrollY, height, element!.contains(document.activeElement));
      setState(old => old.hidden === next.hidden && old.solid === next.solid ? old : next);
    }
    function onScroll() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; refresh(); }); }
    function measure() {
      height = element!.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--storefront-header-height', `${height}px`);
      refresh();
    }
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', measure);
      document.documentElement.style.removeProperty('--storefront-header-height');
    };
  }, []);
  return <div className={`storefront-header-container${state.solid ? ' is-solid' : ''}${state.hidden ? ' is-hidden' : ''}`} onFocusCapture={() => setState(old => ({ ...old, hidden: false }))}>
    <header className="site-header" ref={header}>{children}</header>
  </div>;
}
