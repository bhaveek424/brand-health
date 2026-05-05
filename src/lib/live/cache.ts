import { NormalizedReview } from "@/lib/workbench/normalizer";

interface CacheEntry {
  data: NormalizedReview[];
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getCached(marketplace: string, asin: string): NormalizedReview[] | null {
  const key = `${marketplace}:${asin}`;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCached(marketplace: string, asin: string, data: NormalizedReview[]): void {
  const key = `${marketplace}:${asin}`;
  cache.set(key, { data, expires: Date.now() + TTL_MS });
}
