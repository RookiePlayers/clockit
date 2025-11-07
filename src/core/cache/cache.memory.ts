import { Cache } from "./cache";

// src/core/cache.memory.ts
export type Millis = number;

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt?: number; // epoch ms
}

/**
 * InMemorySuggestionCache
 * - Async interface compatible with the Cache spec
 * - Namespaced keys
 * - TTL-based expiry cleanup
 * - Safe for unit tests and local session caching
 */
export class InMemorySuggestionCache implements Cache {
  private store = new Map<string, Map<string, CacheEntry>>();

  async get<T = unknown>(ns: string, key: string): Promise<T | undefined> {
    const nsMap = this.store.get(ns);
    if (!nsMap) {return undefined;}
    const entry = nsMap.get(key);
    if (!entry) {return undefined;}

    // Check TTL expiry
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      nsMap.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  async set<T = unknown>(
    ns: string,
    key: string,
    value: T,
    opts?: { ttlMs?: Millis }
  ): Promise<void> {
    let nsMap = this.store.get(ns);
    if (!nsMap) {
      nsMap = new Map();
      this.store.set(ns, nsMap);
    }

    const expiresAt = opts?.ttlMs ? Date.now() + opts.ttlMs : undefined;
    nsMap.set(key, { value, expiresAt });
  }

  async del(ns: string, key: string): Promise<void> {
    const nsMap = this.store.get(ns);
    if (!nsMap) {return;}
    nsMap.delete(key);
    if (nsMap.size === 0) {this.store.delete(ns);}
  }

  async list(ns: string, prefix?: string): Promise<string[]> {
    const nsMap = this.store.get(ns);
    if (!nsMap) {return [];}
    const now = Date.now();

    // Filter expired entries
    const keys: string[] = [];
    for (const [key, entry] of nsMap.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        nsMap.delete(key);
        continue;
      }
      if (!prefix || key.startsWith(prefix)) {keys.push(key);}
    }
    return keys;
  }

  async clear(ns: string): Promise<void> {
    this.store.delete(ns);
  }
}