# Redis Setup and Configuration

This document explains how to set up and use Redis for caching and idempotency in the Clockit API.

## Overview

Redis is used for:
- **Response caching** - Stores API responses to reduce database reads
- **Idempotency** - Prevents duplicate requests by caching successful responses
- **Distributed systems** - Enables cache sharing across multiple server instances

## Benefits

✅ **Scalability** - Share cache across multiple API instances
✅ **Persistence** - Cache survives server restarts (optional)
✅ **Performance** - In-memory data store is extremely fast
✅ **Automatic expiration** - Built-in TTL support
✅ **Fallback** - Automatically falls back to in-memory cache if Redis unavailable

## Installation

### Local Development (macOS)

```bash
# Install Redis via Homebrew
brew install redis

# Start Redis server
brew services start redis

# Verify it's running
redis-cli ping
# Should return: PONG
```

### Local Development (Ubuntu/Debian)

```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server

# Enable on boot
sudo systemctl enable redis-server

# Verify it's running
redis-cli ping
# Should return: PONG
```

### Local Development (Docker)

```bash
# Run Redis in Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Verify it's running
docker exec redis redis-cli ping
# Should return: PONG
```

## Configuration

### Environment Variables

Add to your `.env` or `.env.local` file:

```bash
# Local development (no auth)
REDIS_URL=redis://localhost:6379

# Production with password
REDIS_URL=redis://:your_password@hostname:port

# Redis Cloud / Upstash
REDIS_URL=rediss://default:password@host:port
```

### Connection Options

The Redis service supports standard Redis connection URLs:

- **Local:** `redis://localhost:6379`
- **With password:** `redis://:password@hostname:port`
- **TLS/SSL:** `rediss://username:password@hostname:port`
- **With database selection:** `redis://localhost:6379/2`

## Production Deployment

### Option 1: Redis Cloud (Recommended)

[Redis Cloud](https://redis.com/redis-enterprise-cloud/) offers a free tier:

1. Sign up at https://redis.com/try-free/
2. Create a new database
3. Copy the connection URL
4. Set `REDIS_URL` environment variable

```bash
REDIS_URL=rediss://default:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

### Option 2: Upstash

[Upstash](https://upstash.com/) offers serverless Redis:

1. Sign up at https://upstash.com
2. Create a Redis database
3. Copy the `REDIS_URL` from the dashboard
4. Set environment variable

```bash
REDIS_URL=rediss://default:password@us1-able-firefly-12345.upstash.io:6379
```

### Option 3: Self-Hosted

For production self-hosting:

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf

# Important settings:
# - Set a password: requirepass your_strong_password
# - Bind to internal IP: bind 127.0.0.1
# - Enable persistence: appendonly yes
# - Set max memory: maxmemory 256mb
# - Set eviction policy: maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
```

## Usage

### Automatic Integration

The Redis service is automatically used by:
- Cache middleware (`src/middleware/cache.ts`)
- Idempotency middleware (`src/middleware/idempotency.ts`)

No code changes needed - just set `REDIS_URL` and restart the server.

### Fallback Behavior

If Redis is unavailable:
- Middleware automatically falls back to in-memory caching
- No errors are thrown
- Application continues to function normally
- Check logs for Redis connection warnings

### Monitoring

The service logs connection events:
```
Redis Client Connected
Redis Client Ready
Redis Client Reconnecting (if connection lost)
Redis Client Error: <error details>
```

## Cache Key Structure

### Response Cache

Keys are prefixed with `cache:` and include:
- HTTP method
- Request path
- User ID
- Query parameters

Example: `cache:GET:/api/uploads:user123:limit=100`

### Idempotency Cache

Keys are prefixed with `idempotency:` and include:
- User ID
- HTTP method
- Request path
- Client-provided idempotency key

Example: `idempotency:user123:POST:/api/uploads:550e8400-e29b-41d4-a716-446655440000`

## Cache Expiration

Default TTL values:
- **Stats:** 5 minutes
- **Upload list:** 2 minutes
- **Individual upload:** 10 minutes
- **Idempotency keys:** 24 hours (uploads), 1 hour (deletes)

TTLs are automatically managed by Redis.

## Debugging

### View Cache Statistics

The API provides stats endpoints (add these to your routes if needed):

```typescript
import { getCacheStats } from '@/middleware/cache';
import { getIdempotencyStats } from '@/middleware/idempotency';
import { redisService } from '@/services/redis.service';

// Cache stats
router.get('/debug/cache-stats', async (req, res) => {
  const stats = await getCacheStats();
  res.json(stats);
});

// Idempotency stats
router.get('/debug/idempotency-stats', async (req, res) => {
  const stats = await getIdempotencyStats();
  res.json(stats);
});

// Redis info
router.get('/debug/redis-info', async (req, res) => {
  const info = await redisService.getInfo();
  res.json(info);
});
```

### Redis CLI Commands

```bash
# Connect to Redis
redis-cli

# View all keys
KEYS *

# View cache keys only
KEYS cache:*

# View idempotency keys only
KEYS idempotency:*

# Get a specific key
GET "cache:GET:/api/stats:user123:"

# Check TTL (time to live) in seconds
TTL "cache:GET:/api/stats:user123:"

# Get database size
DBSIZE

# Clear all cache keys (use with caution!)
KEYS cache:* | xargs redis-cli DEL

# Flush entire database (DANGER!)
FLUSHDB
```

### Response Headers

Check cache hit/miss status in response headers:
```
X-Cache: HIT                    # Response served from cache
X-Cache: MISS                   # Response not cached, fetched fresh
X-Cache-Backend: redis          # Using Redis
X-Cache-Backend: memory         # Using in-memory fallback
X-Idempotent-Replayed: true     # Idempotent request, cached response
```

## Performance Tuning

### Memory Management

Redis will automatically evict old entries when max memory is reached:

```bash
# In redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru  # Evict least recently used keys
```

### Connection Pooling

The Redis client automatically handles:
- Connection pooling
- Automatic reconnection
- Exponential backoff on failures

### Persistence (Optional)

For production, enable Redis persistence:

```bash
# In redis.conf
appendonly yes                 # Enable AOF (Append Only File)
appendfsync everysec          # Sync every second (good balance)
save 900 1                    # Save after 900s if 1 key changed
save 300 10                   # Save after 300s if 10 keys changed
save 60 10000                 # Save after 60s if 10000 keys changed
```

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:** Redis server not running. Start it:
```bash
brew services start redis  # macOS
sudo systemctl start redis-server  # Linux
```

### Authentication Failed

```
Error: ERR AUTH <password> called without any password configured
```

**Solution:** Remove password from REDIS_URL for local dev:
```bash
REDIS_URL=redis://localhost:6379
```

### TLS/SSL Errors

```
Error: self signed certificate
```

**Solution:** For development, you can disable TLS verification (not recommended for production):
```typescript
// In redis.service.ts, add to client options:
socket: {
  tls: true,
  rejectUnauthorized: false  // Dev only!
}
```

### Memory Errors

```
Error: OOM command not allowed when used memory > 'maxmemory'
```

**Solution:** Increase maxmemory or enable eviction:
```bash
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## Migration from In-Memory Cache

The application automatically migrates to Redis when you:
1. Set `REDIS_URL` environment variable
2. Restart the server

No data migration needed - cache will repopulate on first requests.

## Security Best Practices

✅ **Use TLS in production** - Use `rediss://` URLs
✅ **Set strong passwords** - Use long random passwords
✅ **Bind to private network** - Don't expose Redis to public internet
✅ **Use firewall rules** - Restrict access to Redis port (6379)
✅ **Regular backups** - If using persistence, backup RDB/AOF files
✅ **Monitor logs** - Watch for unauthorized access attempts

## Cost Optimization

- **Free tiers:** Redis Cloud offers 30MB free, Upstash offers generous free tier
- **TTL optimization:** Set appropriate TTLs to avoid unnecessary storage
- **Selective caching:** Only cache frequently accessed, expensive queries
- **Monitor usage:** Track key count and memory usage

## Further Reading

- [Redis Documentation](https://redis.io/docs/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Node Redis Client](https://github.com/redis/node-redis)
