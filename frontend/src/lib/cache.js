// Simple in-memory cache for rarely-changing data (questions, machines, panels, chillers).
// TTL defaults to 5 minutes. Cache is cleared on page refresh automatically.
const store = new Map();

export function getCached(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key, value, ttlMs = 5 * 60 * 1000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(key) {
  if (key) store.delete(key);
  else store.clear();
}

// Wrapper: fetches via apiFn only if not cached, then stores result.
export async function withCache(key, apiFn, ttlMs = 5 * 60 * 1000) {
  const hit = getCached(key);
  if (hit !== null) return hit;
  const result = await apiFn();
  setCached(key, result, ttlMs);
  return result;
}
