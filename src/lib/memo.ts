import "server-only";

/**
 * Tiny in-memory cache for the public shop's read-mostly data (catalog, content, offers…).
 * It lives on globalThis so every server bundle (pages and server actions) shares one copy, costs
 * no disk and no extra service, and is emptied by bustMemo() whenever staff change something.
 * The TTL is only a safety net (e.g. an offer reaching its end date).
 */
type Entry = { at: number; value: Promise<unknown> };
const g = globalThis as unknown as { __memo?: Map<string, Entry> };
const store = () => (g.__memo ??= new Map());

export function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const s = store();
  const hit = s.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load().catch((e) => {
    s.delete(key); // never keep a failure
    throw e;
  });
  s.set(key, { at: Date.now(), value });
  return value;
}

export function bustMemo() {
  store().clear();
}
