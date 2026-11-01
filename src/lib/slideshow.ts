export const SLIDE_INTERVAL = 8000;

// Only an explicit pause, a reduced-motion preference or a hidden tab can
// pause autoplay. Ordinary pointer, focus and click activity never does.
export function createSlideshow(count: number, onChange: (index: number) => void, clock: 'timer' | 'animation' = 'timer') {
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false, completedWhilePaused = false;
  const pauses = new Set<string>();
  function schedule() {
    clearTimeout(timer);
    if (clock === 'timer' && !destroyed && count > 1 && pauses.size === 0) {
      timer = setTimeout(() => move(1), SLIDE_INTERVAL);
    }
  }
  function goTo(next: number) {
    if (destroyed || count < 1) return;
    completedWhilePaused = false;
    index = ((next % count) + count) % count;
    onChange(index);
    schedule();
  }
  function move(direction: number) { goTo(index + direction); }
  schedule();
  return {
    goTo,
    // The hero changes only when its fit-to-frame animation actually ends.
    finishAnimation() {
      if (clock !== 'animation' || destroyed || count <= 1) return;
      if (pauses.size) { completedWhilePaused = true; return; }
      move(1);
    },
    next: () => move(1),
    previous: () => move(-1),
    pause(reason: 'user' | 'motion' | 'hidden', paused: boolean) {
      if (destroyed || pauses.has(reason) === paused) return;
      if (paused) pauses.add(reason); else pauses.delete(reason);
      // A boundary event queued just as the tab hides must not strand the image.
      if (clock === 'animation' && completedWhilePaused && pauses.size === 0) move(1);
      else schedule();
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
  onPause: (paused: boolean) => void = () => {},
) {
  const preference = () => { slideshow.pause('motion', motion.matches); onMotion(motion.matches); onPause(page.hidden || motion.matches); };
  const visibility = () => { slideshow.pause('hidden', page.hidden); onPause(page.hidden || motion.matches); };
  preference(); visibility();
  page.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', preference);
  return () => { page.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', preference); };
}
