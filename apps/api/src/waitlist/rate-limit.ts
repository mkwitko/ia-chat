const WINDOW_MS = 60_000;
const MAX_HITS = 10;

/**
 * Fixed-window counter per key, in memory.
 * ponytail: per process; with several API instances the real limit is multiplied. Move to
 * Postgres or the edge (Cloudflare rules) if the form is attacked.
 */
export function createRateLimiter(now: () => number = Date.now): (key: string) => boolean {
  const windows = new Map<string, { start: number; hits: number }>();
  return (key) => {
    const at = now();
    const current = windows.get(key);
    if (!current || at - current.start >= WINDOW_MS) {
      windows.set(key, { start: at, hits: 1 });
      return true;
    }
    current.hits += 1;
    return current.hits <= MAX_HITS;
  };
}
