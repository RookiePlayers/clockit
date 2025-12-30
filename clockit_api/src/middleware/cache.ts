import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { redisService } from '@/services/redis.service';

interface CacheEntry {
  data: unknown;
  timestamp: number;
  etag: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
}

class ResponseCache {
  private readonly CACHE_PREFIX = 'cache:';
  private fallbackCache = new Map<string, CacheEntry>(); // Fallback when Redis unavailable

  /**
   * Generate cache key from request
   */
  private generateKey(req: Request, customGenerator?: (req: Request) => string): string {
    if (customGenerator) {
      return customGenerator(req);
    }

    // Default: combine method, path, user ID, and query params
    const userId = (req as any).user?.uid as string | undefined;
    const authHeader = req.headers.authorization;
    const authKey = authHeader
      ? `auth:${createHash('sha256').update(authHeader).digest('hex').slice(0, 12)}`
      : 'anonymous';
    const userKey = userId ? `user:${userId}` : authKey;
    const queryString = new URLSearchParams(req.query as any).toString();
    const key = `${req.method}:${req.path}:${userKey}${queryString ? `:${queryString}` : ''}`;
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Generate ETag from data
   */
  private generateETag(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `"${Math.abs(hash).toString(36)}"`;
  }

  /**
   * Get cached response
   */
  async get(key: string, ttl: number): Promise<CacheEntry | null> {
    // Try Redis first
    const redisAvailable = await redisService.isAvailable();

    if (redisAvailable) {
      const cached = await redisService.getJSON<CacheEntry>(key);
      if (cached) {
        // Check if expired (Redis should handle this, but double-check)
        const now = Date.now();
        if (now - cached.timestamp <= ttl) {
          return cached;
        }
        // Expired, delete it
        await redisService.del(key);
      }
      return null;
    }

    // Fallback to in-memory cache
    const entry = this.fallbackCache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > ttl) {
      // Cache expired
      this.fallbackCache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Set cached response
   */
  async set(key: string, data: unknown, ttl: number): Promise<CacheEntry> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      etag: this.generateETag(data),
    };

    // Try Redis first
    const redisAvailable = await redisService.isAvailable();

    if (redisAvailable) {
      await redisService.setJSON(key, entry, ttl);
    } else {
      // Fallback to in-memory cache
      this.fallbackCache.set(key, entry);
    }

    return entry;
  }

  /**
   * Clear cache by key or pattern
   */
  async clear(pattern?: string): Promise<void> {
    const redisAvailable = await redisService.isAvailable();

    if (redisAvailable) {
      if (!pattern) {
        // Clear all cache entries
        await redisService.delPattern(`${this.CACHE_PREFIX}*`);
      } else {
        // Clear entries matching pattern (e.g., "/api/stats")
        await redisService.delPattern(`${this.CACHE_PREFIX}*${pattern}*`);
      }
    }

    // Also clear fallback cache
    if (!pattern) {
      this.fallbackCache.clear();
      return;
    }

    const keys = Array.from(this.fallbackCache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.fallbackCache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<Record<string, unknown>> {
    const redisAvailable = await redisService.isAvailable();

    if (redisAvailable) {
      const info = await redisService.getInfo();

      return {
        backend: 'redis',
        ...info,
      };
    }

    return {
      backend: 'memory',
      size: this.fallbackCache.size,
      keys: Array.from(this.fallbackCache.keys()),
    };
  }
}

// Singleton cache instance
const responseCache = new ResponseCache();

/**
 * Cache middleware factory
 *
 * @example
 * router.get('/stats', cache({ ttl: 300000 }), getStats);
 */
export function cache(options: CacheOptions = {}) {
  const ttl = options.ttl ?? 5 * 60 * 1000; // Default 5 minutes

  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests by default
    if (req.method !== 'GET') {
      next();
      return;
    }

    // Allow custom skip logic
    if (options.skipCache && options.skipCache(req)) {
      next();
      return;
    }

    const cacheKey = responseCache['generateKey'](req, options.keyGenerator);

    // Check cache (async)
    void (async () => {
      try {
        const cached = await responseCache.get(cacheKey, ttl);
        if (cached) {
          // Check if client has matching ETag (304 Not Modified)
          const clientETag = req.headers['if-none-match'];
          if (clientETag === cached.etag) {
            res.status(304).end();
            return;
          }

          // Return cached response
          res
            .set('X-Cache', 'HIT')
            .set('X-Cache-Backend', await redisService.isAvailable() ? 'redis' : 'memory')
            .set('ETag', cached.etag)
            .set('Cache-Control', `private, max-age=${Math.floor(ttl / 1000)}`)
            .json(cached.data);
          return;
        }

        // Cache miss - intercept response
        const originalJson = res.json.bind(res);

        res.json = function(data: any) {
          // Store in cache (async, don't wait)
          void (async () => {
            try {
              const entry = await responseCache.set(cacheKey, data, ttl);

              // Set cache headers
              res.set('X-Cache', 'MISS');
              res.set('X-Cache-Backend', await redisService.isAvailable() ? 'redis' : 'memory');
              res.set('ETag', entry.etag);
              res.set('Cache-Control', `private, max-age=${Math.floor(ttl / 1000)}`);
            } catch (err) {
              console.error('Cache set error:', err);
            }
          })();

          return originalJson(data);
        };

        next();
      } catch (err) {
        console.error('Cache middleware error:', err);
        next();
      }
    })();
  };
}

/**
 * Middleware to clear cache based on route patterns
 * Use this on POST/PUT/DELETE routes that modify data
 *
 * @example
 * router.post('/stats/refresh', clearCache('/api/stats'), refreshStats);
 */
export function clearCache(pattern?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    void responseCache.clear(pattern);
    next();
  };
}

/**
 * Get cache statistics (for debugging)
 */
export async function getCacheStats(): Promise<Record<string, unknown>> {
  return await responseCache.getStats();
}

export { responseCache };
