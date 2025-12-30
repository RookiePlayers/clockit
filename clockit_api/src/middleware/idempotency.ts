import { Request, Response, NextFunction } from 'express';
import { redisService } from '@/services/redis.service';

interface IdempotencyEntry {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
}

class IdempotencyStore {
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly IDEMPOTENCY_PREFIX = 'idempotency:';
  private fallbackStore = new Map<string, IdempotencyEntry>(); // Fallback when Redis unavailable

  /**
   * Get cached response for an idempotency key
   */
  async get(key: string, ttl: number = this.DEFAULT_TTL): Promise<IdempotencyEntry | null> {
    const fullKey = `${this.IDEMPOTENCY_PREFIX}${key}`;

    // Try Redis first
    const redisAvailable = await redisService.isAvailable();

    if (redisAvailable) {
      const entry = await redisService.getJSON<IdempotencyEntry>(fullKey);
      if (entry) {
        // Check if entry has expired (Redis should handle this, but double-check)
        if (Date.now() - entry.timestamp <= ttl) {
          return entry;
        }
        // Expired, delete it
        await redisService.del(fullKey);
      }
      return null;
    }

    // Fallback to in-memory store
    const entry = this.fallbackStore.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > ttl) {
      this.fallbackStore.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Store a response with idempotency key
   */
  async set(key: string, entry: IdempotencyEntry, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const fullKey = `${this.IDEMPOTENCY_PREFIX}${key}`;

    // Try Redis first
    const redisAvailable = await redisService.isAvailable();

    if (redisAvailable) {
      await redisService.setJSON(fullKey, entry, ttl);
    } else {
      // Fallback to in-memory store
      this.fallbackStore.set(key, entry);
    }
  }

  /**
   * Clear expired entries (for in-memory fallback)
   */
  cleanup(ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();
    for (const [key, entry] of this.fallbackStore.entries()) {
      if (now - entry.timestamp > ttl) {
        this.fallbackStore.delete(key);
      }
    }
  }

  /**
   * Get store statistics
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
      size: this.fallbackStore.size,
      keys: Array.from(this.fallbackStore.keys()),
    };
  }
}

// Singleton instance
const idempotencyStore = new IdempotencyStore();

// Cleanup expired entries every hour (for in-memory fallback)
setInterval(() => {
  idempotencyStore.cleanup();
}, 60 * 60 * 1000);

export interface IdempotencyOptions {
  /**
   * Time-to-live for idempotency keys in milliseconds
   * Default: 24 hours
   */
  ttl?: number;

  /**
   * Header name for idempotency key
   * Default: 'Idempotency-Key'
   */
  headerName?: string;

  /**
   * Whether idempotency key is required
   * Default: false (optional)
   */
  required?: boolean;
}

/**
 * Idempotency middleware for preventing duplicate requests
 *
 * Usage:
 * router.post('/uploads', idempotent({ required: true }), handler);
 *
 * Client should send: Idempotency-Key: <unique-uuid>
 *
 * If the same key is sent within TTL window:
 * - Returns cached response with 200 status
 * - Adds X-Idempotent-Replayed: true header
 */
export function idempotent(options: IdempotencyOptions = {}) {
  const {
    ttl = 24 * 60 * 60 * 1000, // 24 hours
    headerName = 'Idempotency-Key',
    required = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Only apply to mutation methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      next();
      return;
    }

    const idempotencyKey = req.get(headerName);

    // If no key provided
    if (!idempotencyKey) {
      if (required) {
        res.status(400).json({
          success: false,
          error: {
            code: 'IDEMPOTENCY_KEY_REQUIRED',
            message: `${headerName} header is required for this endpoint`,
          },
        });
        return;
      }
      // Key not required, proceed without idempotency
      next();
      return;
    }

    // Validate key format (should be UUID-like or similar)
    if (idempotencyKey.length < 16 || idempotencyKey.length > 255) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IDEMPOTENCY_KEY',
          message: `${headerName} must be between 16 and 255 characters`,
        },
      });
      return;
    }

    // Create unique key including user context if available
    const userId = (req as any).user?.uid || 'anonymous';
    const uniqueKey = `${userId}:${req.method}:${req.path}:${idempotencyKey}`;

    // Check if we have a cached response (async)
    void (async () => {
      try {
        const cached = await idempotencyStore.get(uniqueKey, ttl);
        if (cached) {
          // Return cached response
          res
            .status(cached.statusCode)
            .set(cached.headers)
            .set('X-Idempotent-Replayed', 'true')
            .set('X-Cache-Backend', await redisService.isAvailable() ? 'redis' : 'memory')
            .json(cached.body);
          return;
        }

        // Intercept response to cache it
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        let responseSent = false;

        const cacheResponse = (body: unknown) => {
          if (responseSent) {
            return;
          }
          responseSent = true;

          // Only cache successful responses (2xx status codes)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const entry: IdempotencyEntry = {
              statusCode: res.statusCode,
              headers: {
                'Content-Type': res.get('Content-Type') || 'application/json',
              },
              body,
              timestamp: Date.now(),
            };

            void idempotencyStore.set(uniqueKey, entry, ttl);
          }
        };

        // Override json method
        res.json = function (body: unknown) {
          cacheResponse(body);
          return originalJson(body);
        };

        // Override send method (fallback)
        res.send = function (body: unknown) {
          cacheResponse(body);
          return originalSend(body);
        };

        next();
      } catch (err) {
        console.error('Idempotency middleware error:', err);
        next();
      }
    })();
  };
}

/**
 * Get idempotency store statistics (for debugging)
 */
export async function getIdempotencyStats(): Promise<Record<string, unknown>> {
  return await idempotencyStore.getStats();
}
