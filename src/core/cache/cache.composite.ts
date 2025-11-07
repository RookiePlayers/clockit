import type { Cache, Millis } from './cache';

/**
 * CompositeCache: read from the first cache that hits; writes to all.
 * Useful for (memory -> persistent) fanout now, Redis later.
 */
export class CompositeCache implements Cache {
  constructor(private readonly layers: Cache[]) {}

  async get<T = unknown>(ns: string, key: string): Promise<T | undefined> {
    for (const layer of this.layers) {
      const v = await layer.get<T>(ns, key);
      if (v !== undefined) {return v;}
    }
    return undefined;
  }

  async set<T = unknown>(ns: string, key: string, value: T, opts?: { ttlMs?: Millis }): Promise<void> {
    await Promise.all(this.layers.map(l => l.set(ns, key, value, opts)));
  }

  async del(ns: string, key: string): Promise<void> {
    await Promise.all(this.layers.map(l => l.del(ns, key)));
  }

  async list(ns: string, prefix?: string): Promise<string[]> {
    // Prefer union of first cache that supports list meaningfully
    const first = this.layers[0];
    return first.list(ns, prefix);
  }

  async clear(ns: string): Promise<void> {
    await Promise.all(this.layers.map(l => l.clear(ns)));
  }
}
