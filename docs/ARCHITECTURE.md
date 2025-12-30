# Clockit Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Frontend (clockit_website)                             │
│  ├── UI Components (React)                                       │
│  ├── Firebase Auth (Client SDK)                                 │
│  └── API Client (api-client.ts)                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/REST
                         │ Authorization: Bearer <token>
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      API Gateway Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Express.js Server (clockit_api)                                │
│  ├── CORS, Helmet, Compression                                  │
│  ├── Rate Limiting                                              │
│  └── Request Logging                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Authentication Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  Auth Middleware                                                │
│  ├── Verify Firebase ID Token                                   │
│  ├── Extract User Info (uid, email)                            │
│  └── Attach to Request Object                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     Validation Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Validation Middleware (Zod)                                    │
│  ├── Request Body Validation                                    │
│  ├── Query Parameters Validation                                │
│  └── Path Parameters Validation                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      Routing Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  Routes (routes/*.routes.ts)                                    │
│  ├── /api/v1/tokens                                             │
│  ├── /api/v1/goals      (planned)                              │
│  ├── /api/v1/sessions   (planned)                              │
│  └── /api/v1/uploads    (planned)                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Controller Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Controllers (controllers/*.controller.ts)                      │
│  ├── Parse Request                                              │
│  ├── Call Service Methods                                       │
│  ├── Format Response                                            │
│  └── Handle Errors                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     Service Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  Services (services/*.service.ts)                               │
│  ├── Business Logic                                             │
│  ├── Data Transformation                                        │
│  ├── External API Calls                                         │
│  └── Database Operations                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  Firebase Admin SDK                                             │
│  ├── Firestore (Database)                                       │
│  ├── Storage (Files)                                            │
│  └── Auth (User Management)                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow Example: Create API Token

```
1. User clicks "Create Token" in UI
   └─> frontend: profile/page.tsx

2. Frontend makes API call
   └─> api-client.ts
       POST /api/v1/tokens
       Headers: { Authorization: "Bearer <firebase-id-token>" }
       Body: { name: "VS Code", expiresInDays: 90 }

3. API Gateway processes request
   └─> app.ts
       ├─> CORS check
       ├─> Rate limit check
       └─> Parse JSON body

4. Authentication middleware
   └─> middleware/auth.ts
       ├─> Extract token from Authorization header
       ├─> Verify with Firebase Admin SDK
       └─> Attach user (uid, email) to request

5. Validation middleware
   └─> middleware/validation.ts
       └─> Validate body against createTokenSchema (Zod)

6. Route handler
   └─> routes/tokens.routes.ts
       └─> Forward to TokensController.createToken()

7. Controller
   └─> controllers/tokens.controller.ts
       ├─> Extract uid from req.user
       ├─> Extract body data
       └─> Call TokenService.createToken()

8. Service layer
   └─> services/token.service.ts
       ├─> Generate random token (CryptoService)
       ├─> Hash token (CryptoService)
       ├─> Calculate expiry date
       └─> Call FirestoreService.createDocument()

9. Data layer
   └─> services/firestore.service.ts
       └─> Firestore Admin SDK
           └─> Write to "ApiTokens" collection

10. Response flows back
    └─> Service returns { id, token, name, ... }
        └─> Controller formats success response
            └─> API returns JSON
                └─> Frontend updates UI
```

## Data Flow Diagram

```
┌──────────────┐
│   Browser    │
│  (Next.js)   │
└──────┬───────┘
       │ 1. User Action
       ▼
┌──────────────┐
│  API Client  │
│ (TypeScript) │
└──────┬───────┘
       │ 2. HTTP Request + Auth Token
       ▼
┌──────────────┐
│   Express    │
│   Server     │
└──────┬───────┘
       │ 3. Verify Auth
       ▼
┌──────────────┐
│  Controller  │
│  (Business)  │
└──────┬───────┘
       │ 4. Process Request
       ▼
┌──────────────┐
│   Service    │
│   (Logic)    │
└──────┬───────┘
       │ 5. Database Operation
       ▼
┌──────────────┐
│  Firestore   │
│  (Database)  │
└──────┬───────┘
       │ 6. Return Data
       ▼
     (flows back up)
```

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Transport Security                                       │
│     └─> HTTPS/TLS in production                            │
│                                                              │
│  2. CORS Policy                                             │
│     └─> Allow only specific origins                        │
│         (http://localhost:3000, https://clockit.com)        │
│                                                              │
│  3. Rate Limiting                                           │
│     └─> Default: 100 requests / 15 minutes                 │
│     └─> Strict:  10 requests / 1 minute (token creation)   │
│                                                              │
│  4. Authentication                                          │
│     └─> Firebase ID Token verification                     │
│         ├─> Token signature validation                     │
│         ├─> Expiration check                               │
│         └─> User extraction (uid, email)                   │
│                                                              │
│  5. Authorization                                           │
│     └─> Resource ownership checks                          │
│         (e.g., user can only access their own tokens)      │
│                                                              │
│  6. Input Validation                                        │
│     └─> Zod schema validation                              │
│         ├─> Type checking                                  │
│         ├─> Range validation                               │
│         └─> Format validation                              │
│                                                              │
│  7. Output Sanitization                                     │
│     └─> Structured JSON responses                          │
│     └─> No sensitive data leakage                          │
│                                                              │
│  8. Security Headers                                        │
│     └─> Helmet.js middleware                               │
│         ├─> Content-Security-Policy                        │
│         ├─> X-Frame-Options                                │
│         └─> X-Content-Type-Options                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────┐
│  Request        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Try Block      │
│  (Controller)   │
└────┬───────┬────┘
     │       │
  Success    Error
     │       │
     ▼       ▼
┌─────┐  ┌──────────────────┐
│ 200 │  │  Error Handler   │
│ 201 │  │  (Middleware)    │
│ 204 │  └────────┬─────────┘
└─────┘           │
                  ▼
         ┌────────────────────┐
         │  Known Error?      │
         └───┬─────────┬──────┘
             │         │
         Yes │         │ No
             │         │
             ▼         ▼
    ┌────────────┐  ┌────────────┐
    │  AppError  │  │  500 Error │
    │  (Custom)  │  │  (Unknown) │
    └─────┬──────┘  └─────┬──────┘
          │               │
          ▼               ▼
    ┌─────────────────────────┐
    │  Standardized Response  │
    │  {                      │
    │    success: false,      │
    │    error: {             │
    │      code: "...",       │
    │      message: "..."     │
    │    }                    │
    │  }                      │
    └─────────────────────────┘
```

## File Organization

```
clockit/
│
├── clockit_api/                    # Backend API Server
│   ├── src/
│   │   ├── config/                 # Configuration
│   │   │   ├── env.ts              # Environment validation
│   │   │   ├── firebase-admin.ts   # Firebase Admin init
│   │   │   └── constants.ts        # App constants
│   │   │
│   │   ├── middleware/             # Express middleware
│   │   │   ├── auth.ts             # Authentication
│   │   │   ├── error-handler.ts    # Error handling
│   │   │   ├── validation.ts       # Request validation
│   │   │   └── rate-limit.ts       # Rate limiting
│   │   │
│   │   ├── routes/                 # API routes
│   │   │   ├── index.ts            # Route aggregator
│   │   │   └── tokens.routes.ts    # Token endpoints
│   │   │
│   │   ├── controllers/            # Request handlers
│   │   │   └── tokens.controller.ts
│   │   │
│   │   ├── services/               # Business logic
│   │   │   ├── firestore.service.ts
│   │   │   ├── crypto.service.ts
│   │   │   └── token.service.ts
│   │   │
│   │   ├── models/                 # TypeScript types
│   │   │   └── token.model.ts
│   │   │
│   │   ├── validators/             # Zod schemas
│   │   │   └── token.validator.ts
│   │   │
│   │   ├── utils/                  # Utilities
│   │   │   ├── logger.ts           # Winston logger
│   │   │   ├── errors.ts           # Custom errors
│   │   │   └── response.ts         # Response helpers
│   │   │
│   │   ├── app.ts                  # Express app
│   │   └── server.ts               # Server entry
│   │
│   ├── tests/                      # Test files
│   ├── logs/                       # Log files
│   ├── .env.local                  # Environment vars
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── clockit_website/                # Frontend Next.js App
│   ├── src/
│   │   ├── app/                    # Next.js pages
│   │   │   └── profile/
│   │   │       ├── page.tsx        # Original (Firestore)
│   │   │       └── page.refactored.tsx  # New (API)
│   │   │
│   │   ├── lib/
│   │   │   ├── firebase.ts         # Firebase Client SDK
│   │   │   └── api-client.ts       # API client
│   │   │
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   │
│   └── .env.local                  # Frontend env vars
│
├── MIGRATION_GUIDE.md              # Step-by-step guide
├── REFACTORING_SUMMARY.md          # Executive summary
└── ARCHITECTURE.md                 # This file
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Database**: Firebase Firestore (Admin SDK)
- **Authentication**: Firebase Auth (Admin SDK)
- **Validation**: Zod 3.x
- **Logging**: Winston 3.x
- **Security**: Helmet, CORS, express-rate-limit

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.x
- **UI**: React 19
- **Authentication**: Firebase Auth (Client SDK)
- **Styling**: Tailwind CSS
- **HTTP Client**: Fetch API (native)

### DevOps
- **Build**: TypeScript Compiler
- **Process Manager**: Nodemon (dev), Node (prod)
- **Testing**: Jest (planned)
- **Deployment**: Heroku / Railway / Google Cloud Run

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Production Setup                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐         ┌──────────────┐              │
│  │   Vercel    │         │   Railway    │              │
│  │  (Frontend) │◄────────┤  (Backend)   │              │
│  │             │  API    │              │              │
│  │ Next.js App │  Calls  │  Express API │              │
│  └──────┬──────┘         └──────┬───────┘              │
│         │                       │                       │
│         │ Auth                  │ Admin                 │
│         ▼                       ▼                       │
│  ┌──────────────────────────────────────┐              │
│  │     Firebase (Google Cloud)          │              │
│  ├──────────────────────────────────────┤              │
│  │  • Firestore Database                │              │
│  │  • Authentication                    │              │
│  │  • Cloud Storage                     │              │
│  └──────────────────────────────────────┘              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Performance Considerations

### Caching Strategy (Future Enhancement)

```
┌────────────────┐
│  API Request   │
└───────┬────────┘
        │
        ▼
┌────────────────┐     Hit    ┌─────────────┐
│  Redis Cache   │────────────>│  Return     │
│  (Optional)    │             │  Cached     │
└───────┬────────┘             └─────────────┘
        │ Miss
        ▼
┌────────────────┐
│  Firestore DB  │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  Cache Result  │
└────────────────┘
```

### Optimization Points
1. **Connection pooling**: Reuse Firestore connections
2. **Pagination**: Limit query results
3. **Indexing**: Proper Firestore indexes
4. **Compression**: Gzip response compression
5. **CDN**: Serve static assets via CDN
6. **Caching**: Redis for frequently accessed data (planned)

---

## Monitoring & Observability (Recommended)

```
┌──────────────────────────────────────────────────┐
│              Monitoring Stack                    │
├──────────────────────────────────────────────────┤
│                                                  │
│  Logs:        Winston → CloudWatch / Papertrail │
│  Metrics:     New Relic / Datadog               │
│  Errors:      Sentry                            │
│  Uptime:      UptimeRobot / Pingdom             │
│  APM:         New Relic / AppDynamics           │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Conclusion

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Secure authentication and authorization
- ✅ Scalable layered design
- ✅ Type-safe end-to-end
- ✅ Easy to test and maintain
- ✅ Ready for horizontal scaling
