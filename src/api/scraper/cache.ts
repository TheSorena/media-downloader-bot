import type { CacheEntry, ScrapeResult } from '../types.js';

const CACHE_TTL = 10 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

const cache = new Map<string, CacheEntry>();

export function getCached(key: string): ScrapeResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function setCache(key: string, result: ScrapeResult): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { result, timestamp: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}
