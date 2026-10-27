// In-memory sliding-window rate limiter. Fine for a single-process prototype;
// use Redis (or your gateway) when running more than one instance.
const store = globalThis.__apaarRateLimit || (globalThis.__apaarRateLimit = new Map());

export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const hits = (store.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    store.set(key, hits);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) };
  }
  hits.push(now);
  store.set(key, hits);
  if (store.size > 5000) {
    for (const [k, v] of store) if (!v.length || now - v[v.length - 1] > windowMs) store.delete(k);
  }
  return { ok: true, remaining: max - hits.length };
}
