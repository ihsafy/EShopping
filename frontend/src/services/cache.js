/**
 * Request de-duplication and short-lived caching for read-only endpoints.
 *
 * - Concurrent calls that share a key await one single network request
 *   (React StrictMode double-invokes effects in development, and the layout
 *   plus the page often ask for the same data in the same render).
 * - A successful response stays cached for `ttl` ms, so navigating between
 *   pages does not re-download store/category data over and over.
 * - Failures are never cached: the entry is dropped immediately, nothing
 *   retries on its own, and the caller still sees the original error.
 */
const entries = new Map();

export function cached(key, loader, ttl = 60 * 1000) {
  const hit = entries.get(key);
  if (hit) {
    if (hit.pending) return hit.pending;
    if (hit.expires > Date.now()) return Promise.resolve(hit.value);
  }

  const pending = Promise.resolve()
    .then(loader)
    .then((value) => {
      entries.set(key, { value, expires: Date.now() + ttl, pending: null });
      return value;
    })
    .catch((error) => {
      entries.delete(key);
      throw error;
    });

  entries.set(key, { value: undefined, expires: 0, pending });
  return pending;
}

/** Shares concurrent requests only; every later call fetches fresh data. */
export const dedupe = (key, loader) => cached(key, loader, 0);

/** Drops cached payloads (used after the signed-in customer changes). */
export const invalidate = (key) => entries.delete(key);
