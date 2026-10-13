import manifest from '../image-manifest.json';
import { asset } from './assets';

type Variant = { thumbnail: string; scene: string; display: string; width: number; height: number };
let uploadedVariants: Record<string, Variant> = {};
export function registerImageVariants(variants: Record<string, Variant>) { uploadedVariants = variants; }
export function imageVariant(src: string): Variant {
  return uploadedVariants[src] ?? (manifest as Record<string, Variant>)[src] ?? { thumbnail: src, scene: src, display: src, width: 1000, height: 1000 };
}
// Share in-flight requests across hover, keyboard focus and the photo viewer.
const pending = new Map<string, Promise<void>>();
export function warmImage(path: string) {
  if (pending.has(path)) return pending.get(path)!;
  const promise = new Promise<void>((resolve) => {
    const img = new Image(); img.decoding = 'async'; img.fetchPriority = 'low';
    img.onload = () => resolve(); img.onerror = () => { pending.delete(path); resolve(); };
    img.src = asset(path);
  });
  pending.set(path, promise);
  // Bound bookkeeping; decoded images remain managed by the browser's cache.
  if (pending.size > 24) pending.delete(pending.keys().next().value!);
  return promise;
}
export function canPrefetch() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
}
