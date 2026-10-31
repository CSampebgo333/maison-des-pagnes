export const SLIDE_INTERVAL = 8000;

// Only an explicit pause, a reduced-motion preference or a hidden tab can
// pause autoplay. Ordinary pointer, focus and click activity never does.
export function createSlideshow(count: number, onChange: (index: number) => void) {
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;
  const pauses = new Set<string>();
  function schedule() {
    clearTimeout(timer);
    if (!destroyed && count > 1 && pauses.size === 0) {
      timer = setTimeout(() => move(1), SLIDE_INTERVAL);
    }
  }
  function goTo(next: number) {
    if (destroyed || count < 1) return;
    index = ((next % count) + count) % count;
    onChange(index);
    schedule();
  }
  function move(direction: number) { goTo(index + direction); }
  schedule();
  return {
    goTo,
    next: () => move(1),
    previous: () => move(-1),
    pause(reason: 'user' | 'motion' | 'hidden', paused: boolean) {
      if (destroyed || pauses.has(reason) === paused) return;
      if (paused) pauses.add(reason); else pauses.delete(reason);
      schedule();
    },
    destroy() { destroyed = true; clearTimeout(timer); },
  };
}

// Keep these bindings independent of interaction handlers so hover, focus,
// clicks and scrolling cannot accidentally stop or reset the slideshow.
export function observeSlideshow(
  slideshow: ReturnType<typeof createSlideshow>,
  page: EventTarget & { readonly hidden: boolean },
  motion: EventTarget & { readonly matches: boolean },
  onMotion: (reduced: boolean) => void,
) {
  const preference = () => { slideshow.pause('motion', motion.matches); onMotion(motion.matches); };
  const visibility = () => slideshow.pause('hidden', page.hidden);
  preference(); visibility();
  page.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', preference);
  return () => { page.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', preference); };
}
