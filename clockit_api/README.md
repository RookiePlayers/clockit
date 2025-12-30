# Clockit API

Backend API server for the Clockit application. This server handles all backend operations including authentication, data management, and business logic.

## Architecture

```
src/
├── config/          # Configuration files (Firebase, environment)
├── middleware/      # Express middleware (auth, validation, error handling)
├── routes/          # API route definitions
├── controllers/     # Request/response handlers
├── services/        # Business logic layer
├── models/          # TypeScript types and interfaces
├── validators/      # Request validation schemas (Zod)
├── utils/           # Utility functions (logger, errors, responses)
└── app.ts          # Express app setup
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
```

3. Configure environment variables:
   - `FIREBASE_SERVICE_ACCOUNT_B64`: Base64-encoded Firebase service account JSON
   - `REDIS_URL`: Redis connection URL (optional, falls back to in-memory cache)
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
   - Other variables as needed

4. (Optional) Set up Redis for caching:
   - See [REDIS_SETUP.md](./REDIS_SETUP.md) for detailed instructions
   - Local dev: `brew install redis && brew services start redis`
   - Or use the in-memory fallback (works automatically)

5. Start development server:
```bash
npm run dev
```

6. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
All protected endpoints require a Firebase Auth ID token in the Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

### Tokens API

**Create API Token**
```
POST /api/v1/tokens
Body: { "name": "Token Name", "expiresInDays": 90 }
Response: { "id", "token", "name", "lastFour", "createdAt", "expiresAt" }
```

**List API Tokens**
```
GET /api/v1/tokens
Response: [{ "id", "name", "lastFour", "createdAt", "expiresAt", "lastUsedAt" }]
```

**Get API Token**
```
GET /api/v1/tokens/:tokenId
Response: { "id", "name", "lastFour", "createdAt", "expiresAt", "lastUsedAt" }
```

**Revoke API Token**
```
DELETE /api/v1/tokens/:tokenId
Response: 204 No Content
```

### Health Check
```
GET /api/v1/health
Response: { "status": "ok", "timestamp": "ISO-8601" }
```

## Error Handling

All errors follow this format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

Common error codes:
- `VALIDATION_ERROR` (400)
- `AUTHENTICATION_ERROR` (401)
- `AUTHORIZATION_ERROR` (403)
- `NOT_FOUND` (404)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_ERROR` (500)

## Testing

```bash
npm test
npm run test:watch
```

## Deployment

The API can be deployed to any Node.js hosting platform:
- Heroku
- Google Cloud Run
- AWS ECS/Fargate
- Digital Ocean App Platform
- Railway
- Render

Make sure to set all required environment variables in your deployment platform.

## Migration Status

### Phase 1: API Tokens ✅
- [x] Token creation
- [x] Token listing
- [x] Token revocation
- [ ] Frontend integration (in progress)

### Phase 2: Goals & Sessions (Planned)
- [ ] Goals CRUD operations
- [ ] Sessions management
- [ ] Frontend migration

### Phase 3: Uploads & Processing (Planned)
- [ ] CSV upload handling
- [ ] Data processing
- [ ] Frontend migration

### Phase 4: Feature Flags (Planned)
- [ ] Feature entitlements API
- [ ] Aggregation endpoints
- [ ] Frontend migration
