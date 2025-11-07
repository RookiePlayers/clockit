
export type Millis = number;

export interface CacheItem<T = unknown> {
  value: T;
  /** absolute expiry timestamp in ms since epoch; undefined means no expiry */
  expiresAt?: Millis;
}

export interface Cache {
  /** Lookup a value by namespace+key; undefined if missing or expired */
  get<T = unknown>(ns: string, key: string): Promise<T | undefined>;
  /** Upsert a value; optional TTL in ms */
  set<T = unknown>(ns: string, key: string, value: T, opts?: { ttlMs?: Millis }): Promise<void>;
  /** Delete a key */
  del(ns: string, key: string): Promise<void>;
  /** List keys under a namespace (best-effort; may be approximate depending on backend) */
  list(ns: string, prefix?: string): Promise<string[]>;
  /** Clear a full namespace */
  clear(ns: string): Promise<void>;
}

export interface CacheProvider {
  /** Returns a namespaced Cache implementation (some backends may ignore name) */
  cache(name: string): Cache;
}

// Handy constants
export const TTL = {
  minute: 60_000,
  fiveMinutes: 5 * 60_000,
  hour: 3_600_000,
  day: 86_400_000,
} as const;

