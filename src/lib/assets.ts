declare global {
  interface Window { __PAGNE_ASSETS__?: Record<string, string> }
}

export function asset(path: string) {
  return window.__PAGNE_ASSETS__?.[path] ?? `${import.meta.env.BASE_URL}${path}`;
}
