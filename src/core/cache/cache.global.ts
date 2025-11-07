import * as vscode from 'vscode';
import type { Cache, CacheItem, Millis } from './cache';

export class GlobalStateCache implements Cache {
  constructor(private readonly ctx: vscode.ExtensionContext, private readonly name = 'default') {}

  private key(ns: string, k: string) { return `${this.name}::${ns}::${k}`; }

  async get<T = unknown>(ns: string, key: string): Promise<T | undefined> {
    const raw = this.ctx.globalState.get<CacheItem<T>>(this.key(ns, key));
    if (!raw) {return undefined;}
    if (raw.expiresAt && raw.expiresAt <= Date.now()) { await this.del(ns, key); return undefined; }
    return raw.value;
  }

  async set<T = unknown>(ns: string, key: string, value: T, opts?: { ttlMs?: Millis }): Promise<void> {
    const item: CacheItem<T> = { value, expiresAt: opts?.ttlMs ? Date.now() + opts.ttlMs : undefined };
    await this.ctx.globalState.update(this.key(ns, key), item);
  }

  async del(ns: string, key: string): Promise<void> {
    await this.ctx.globalState.update(this.key(ns, key), undefined);
  }

  async list(ns: string, prefix = ''): Promise<string[]> {
    // globalState has no native list; we can maintain an index per-namespace for small caches
    const indexKey = this.key(ns, '__index__');
    const idx = this.ctx.globalState.get<string[]>(indexKey) ?? [];
    const valid: string[] = [];
    for (const k of idx) {
      if (prefix && !k.startsWith(prefix)) {continue;}
      const item = this.ctx.globalState.get<CacheItem>(this.key(ns, k));
      if (!item) {continue;}
      if (item.expiresAt && item.expiresAt <= Date.now()) { await this.del(ns, k); continue; }
      valid.push(k);
    }
    // refresh index without expired entries
    await this.ctx.globalState.update(indexKey, valid);
    return valid;
  }

  async clear(ns: string): Promise<void> {
    const indexKey = this.key(ns, '__index__');
    const idx = this.ctx.globalState.get<string[]>(indexKey) ?? [];
    for (const k of idx) {await this.del(ns, k);}
    await this.ctx.globalState.update(indexKey, []);
  }
}
