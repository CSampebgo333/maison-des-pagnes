export type InstallPromptEvent = Event & {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// Capture the browser event before async language loading or React rendering.
// Do not cancel its default UI: the browser's own install entry remains available.
export function createInstallController(target: EventTarget, standalone: () => boolean) {
  let deferred: InstallPromptEvent | null = null;
  let installed = standalone();
  let state = { available: false, installed };
  const listeners = new Set<() => void>();
  const update = () => {
    state = { available: deferred !== null, installed };
    listeners.forEach(listener => listener());
  };
  const capture = (event: Event) => {
    if (installed) return;
    deferred = event as InstallPromptEvent;
    update();
  };
  const finish = () => { installed = true; deferred = null; update(); };
  const displayChanged = () => { if (standalone()) finish(); };
  target.addEventListener('beforeinstallprompt', capture);
  target.addEventListener('appinstalled', finish);
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state,
    displayChanged,
    async prompt() {
      const event = deferred;
      if (!event) return false;
      deferred = null; update(); // Each browser event can only be used once.
      try {
        await event.prompt();
        const choice = await event.userChoice;
        if (choice.outcome === 'accepted') finish();
        return true;
      } catch { return false; }
    },
    dispose() {
      target.removeEventListener('beforeinstallprompt', capture);
      target.removeEventListener('appinstalled', finish);
      listeners.clear();
    },
  };
}

const empty = { available: false, installed: false };
let controller: ReturnType<typeof createInstallController> | undefined;
export function initializeInstallPrompt() {
  if (controller) return;
  const media = window.matchMedia('(display-mode: standalone)');
  controller = createInstallController(window, () => media.matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);
  media.addEventListener('change', controller.displayChanged);
}
export const subscribeInstall = (listener: () => void) => controller?.subscribe(listener) ?? (() => {});
export const getInstallState = () => controller?.getSnapshot() ?? empty;
export const promptInstall = () => controller?.prompt() ?? Promise.resolve(false);
