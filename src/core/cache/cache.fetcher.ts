
import type { Cache } from './cache';

export type Page<T> = { items: T[]; nextCursor?: string };

export type FetchPageFn<T> = (args: { query: string; cursor?: string }) => Promise<Page<T>>;

export class CachedFetcher<T> {
  constructor(private readonly cache: Cache, private readonly ns: string, private readonly ttlMs: number) {}

  async search(query: string, fetchPage: FetchPageFn<T>, opts?: { cursor?: string; refresh?: boolean }) {
    const key = this.key(query, opts?.cursor);

    if (!opts?.refresh) {
      const hit = await this.cache.get<Page<T>>(this.ns, key);
      if (hit) {return { ...hit, cached: true as const };}
    }

    const page = await fetchPage({ query, cursor: opts?.cursor });
    await this.cache.set(this.ns, key, page, { ttlMs: this.ttlMs });
    return { ...page, cached: false as const };
  }

  private key(query: string, cursor?: string) {
    return `${query.trim().toLowerCase()}::${cursor ?? 'first'}`;
  }
}
