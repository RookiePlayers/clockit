# Idempotency Middleware

## Overview

The idempotency middleware prevents duplicate requests by caching successful responses and replaying them when the same idempotency key is provided within a time window.

## How It Works

1. **Client sends request** with `Idempotency-Key` header containing a unique UUID
2. **Server checks cache** for existing response with that key
3. **If found**: Returns cached response with `X-Idempotent-Replayed: true` header
4. **If not found**: Processes request normally and caches successful response (2xx status)

## Usage

### Server-Side (API Routes)

```typescript
import { idempotent } from '@/middleware/idempotency';

router.post(
  '/uploads',
  authenticate,
  idempotent({ ttl: 24 * 60 * 60 * 1000 }), // 24 hour TTL
  asyncHandler(UploadsController.createUpload)
);
```

### Client-Side (Frontend)

The API client automatically generates idempotency keys when the `idempotent` flag is set:

```typescript
// API client will automatically send Idempotency-Key header
uploadsApi.create(data) // idempotent=true by default
```

## Configuration

```typescript
idempotent({
  ttl: 24 * 60 * 60 * 1000,      // Time-to-live (default: 24 hours)
  headerName: 'Idempotency-Key',  // Header name (default: 'Idempotency-Key')
  required: false                 // Whether key is required (default: false)
})
```

## Protected Endpoints

The following endpoints use idempotency protection:

### Uploads
- `POST /api/v1/uploads` - 24 hour TTL
- `DELETE /api/v1/uploads/:uploadId` - 1 hour TTL

### Stats
- `POST /api/v1/stats/achievements` - 24 hour TTL

## Implementation Details

### Key Format

The idempotency key must be:
- Between 16 and 255 characters
- Typically a UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)

### Cache Key Structure

Internal cache keys include user context:
```
{userId}:{method}:{path}:{idempotencyKey}
```

Example: `user123:POST:/api/v1/uploads:550e8400-e29b-41d4-a716-446655440000`

### Response Caching

Only successful responses (2xx status codes) are cached. The cache stores:
- Status code
- Response headers (Content-Type)
- Response body
- Timestamp

### Cache Cleanup

Expired entries are automatically cleaned up every hour.

## Benefits

1. **Prevents duplicate uploads** if user accidentally clicks upload button twice
2. **Prevents duplicate deletes** if network retry occurs
3. **Prevents duplicate achievements** if user reloads advanced-stats page
4. **Network-safe** - retries with same key return same response
5. **Standards-compliant** - follows IETF draft for idempotency headers

## Example Workflow

### Successful Upload with Retry

```
1. Client: POST /uploads + Idempotency-Key: abc-123
2. Server: Processes upload → 200 OK (cached for 24h)
3. Client: Network timeout, retry with same key
4. Server: Returns cached response + X-Idempotent-Replayed: true
```

### Different Upload

```
1. Client: POST /uploads + Idempotency-Key: abc-123
2. Server: Returns cached response from previous upload
3. Client: POST /uploads + Idempotency-Key: xyz-789 (new key)
4. Server: Processes new upload → 200 OK (new cache entry)
```

## Debugging

Check cache statistics (for debugging purposes):

```typescript
import { getIdempotencyStats } from '@/middleware/idempotency';

const stats = getIdempotencyStats();
// Returns: { size: 10, keys: [...] }
```

## Headers

### Request Headers
- `Idempotency-Key` - UUID v4 or similar unique identifier

### Response Headers
- `X-Idempotent-Replayed: true` - Present when returning cached response

## Error Responses

### Missing Required Key
```json
{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_KEY_REQUIRED",
    "message": "Idempotency-Key header is required for this endpoint"
  }
}
```

### Invalid Key Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_IDEMPOTENCY_KEY",
    "message": "Idempotency-Key must be between 16 and 255 characters"
  }
}
```
