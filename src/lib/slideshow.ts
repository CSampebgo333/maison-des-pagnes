export const SLIDE_INTERVAL = 8000;

// Each pause reason is independent: leaving the picture must not resume a
// slideshow the visitor paused, or one hidden in another browser tab.
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
    pause(reason: string, paused: boolean) {
      if (destroyed) return;
      if (paused) pauses.add(reason); else pauses.delete(reason);
      schedule();
    },
    destroy() { destroyed = true; clearTimeout(timer); },
  };
}
