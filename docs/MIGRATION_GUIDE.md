# Backend/Frontend Separation Migration Guide

This guide explains the refactoring process to separate backend logic from frontend code in the Clockit application.

## Table of Contents
1. [Overview](#overview)
2. [Architecture Changes](#architecture-changes)
3. [Setup Instructions](#setup-instructions)
4. [Migration Phases](#migration-phases)
5. [Testing](#testing)
6. [Deployment](#deployment)

---

## Overview

### Problem
- Backend operations (Firestore queries, business logic) embedded in frontend components
- Tight coupling between UI and server-side operations
- Difficult to test, maintain, and scale
- Security concerns (client-side database access)

### Solution
- Separate Express.js API server (`clockit_api/`)
- Frontend communicates exclusively through REST API
- Proper separation of concerns with layered architecture
- Firebase Admin SDK on server, Firebase Client SDK only for auth on frontend

---

## Architecture Changes

### Before
```
Frontend (Next.js)
  ├── Direct Firestore access (client SDK)
  ├── Business logic in components
  ├── Direct Storage uploads
  └── Mixed concerns
```

### After
```
Frontend (Next.js)
  ├── UI Components only
  ├── API Client for backend communication
  └── Firebase Client SDK (Auth only)

Backend (Express.js)
  ├── Routes → Controllers → Services → Firestore
  ├── Firebase Admin SDK
  ├── Business logic centralized
  └── Authentication middleware
```

### Layer Responsibilities

**Frontend:**
- UI rendering and user interactions
- Client-side validation
- Authentication state management (Firebase Auth)
- API calls through `api-client.ts`

**Backend:**
- Authentication (Firebase ID token verification)
- Authorization (resource ownership checks)
- Business logic execution
- Database operations (Firestore Admin SDK)
- File processing
- Data validation (server-side)

---

## Setup Instructions

### 1. Backend Setup

1. **Navigate to API directory:**
   ```bash
   cd clockit_api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```

4. **Set environment variables in `.env.local`:**
   ```env
   NODE_ENV=development
   PORT=3001
   FIREBASE_SERVICE_ACCOUNT_B64=<your_base64_service_account>
   ALLOWED_ORIGINS=http://localhost:3000
   ```

   **To get FIREBASE_SERVICE_ACCOUNT_B64:**
   ```bash
   # Download service account JSON from Firebase Console
   # Then encode it:
   cat service-account.json | base64
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

   Server will run on `http://localhost:3001`

### 2. Frontend Setup

1. **Navigate to website directory:**
   ```bash
   cd clockit_website
   ```

2. **Add API URL to `.env.local`:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
   ```

3. **Install any new dependencies (if needed):**
   ```bash
   npm install
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

### 3. Verify Setup

1. **Check API health:**
   ```bash
   curl http://localhost:3001/api/v1/health
   ```

   Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

2. **Test authentication:**
   - Sign in to the frontend
   - Open browser DevTools Network tab
   - Create an API token
   - Verify requests go to `localhost:3001` with Authorization header

---

## Migration Phases

### Phase 1: API Tokens (COMPLETED ✅)

**Backend Changes:**
- ✅ Created Express server structure
- ✅ Implemented Firebase Admin SDK integration
- ✅ Built authentication middleware
- ✅ Created tokens API endpoints (CRUD)
- ✅ Implemented service layer for token operations

**Frontend Changes:**
- ✅ Created API client (`lib/api-client.ts`)
- ✅ Refactored profile page (see `page.refactored.tsx`)

**To Apply:**
1. Start backend server: `cd clockit_api && npm run dev`
2. Replace `clockit_website/src/app/profile/page.tsx` with `page.refactored.tsx`
3. Test token creation, listing, and revocation

**Removed from Frontend:**
- Direct Firestore imports for tokens
- `addDoc`, `getDocs`, `deleteDoc` operations
- Token hashing logic (moved to backend)

---

### Phase 2: Goals Management (PLANNED)

**Files to Migrate:**
- `clockit_website/src/app/clockit-online/components/GoalsTab.tsx`
- `clockit_website/src/services/featureFlags.ts` (partial)

**Backend Tasks:**
- [ ] Create goals routes (`/api/v1/goals`)
- [ ] Implement goals controller
- [ ] Build goals service layer
- [ ] Add validation schemas
- [ ] Support CRUD operations
- [ ] Handle goal groups

**Frontend Tasks:**
- [ ] Update GoalsTab to use API
- [ ] Remove direct Firestore access
- [ ] Update localStorage + API sync logic

**API Endpoints:**
```
GET    /api/v1/goals          - List user's goals
POST   /api/v1/goals          - Create goal
GET    /api/v1/goals/:id      - Get goal
PUT    /api/v1/goals/:id      - Update goal
DELETE /api/v1/goals/:id      - Delete goal
POST   /api/v1/goals/:id/complete - Mark complete
```

---

### Phase 3: Sessions Management (PLANNED)

**Files to Migrate:**
- `clockit_website/src/app/clockit-online/components/SessionsTab.tsx`

**Backend Tasks:**
- [ ] Create sessions routes
- [ ] Implement sessions controller
- [ ] Build sessions service
- [ ] Support session lifecycle

**Frontend Tasks:**
- [ ] Update SessionsTab component
- [ ] Remove Firestore dependencies

---

### Phase 4: CSV Uploads & Processing (PLANNED)

**Files to Migrate:**
- `clockit_website/src/components/UploadCSV.tsx`
- `clockit_website/src/components/RefreshAggregates.tsx`

**Backend Tasks:**
- [ ] Create upload endpoint with multipart support
- [ ] Move CSV parsing to server
- [ ] Implement file validation
- [ ] Handle aggregation triggers

**Frontend Tasks:**
- [ ] Update UploadCSV component
- [ ] Remove PapaParse from client
- [ ] Display upload progress

---

### Phase 5: Feature Flags (PLANNED)

**Files to Migrate:**
- `clockit_website/src/services/featureFlags.ts`
- `clockit_website/src/hooks/useFeature.ts`

**Backend Tasks:**
- [ ] Create feature entitlements API
- [ ] Implement caching layer
- [ ] Add admin endpoints

**Frontend Tasks:**
- [ ] Update useFeature hook
- [ ] Cache feature flags client-side

---

## Testing

### Backend Tests

```bash
cd clockit_api
npm test
```

**Test Coverage:**
- Unit tests for services
- Integration tests for API endpoints
- Authentication middleware tests
- Validation tests

### Frontend Tests

```bash
cd clockit_website
npm test
```

**Test Coverage:**
- API client tests
- Component rendering tests
- Integration tests with mock API

### Manual Testing Checklist

**API Tokens:**
- [ ] Create token with name and expiry
- [ ] Create token without expiry
- [ ] List all tokens
- [ ] Revoke token
- [ ] Verify unauthorized access blocked
- [ ] Test rate limiting (create 10+ tokens quickly)

**Error Handling:**
- [ ] Test with invalid auth token
- [ ] Test with missing auth token
- [ ] Test with invalid request body
- [ ] Verify error messages are user-friendly

---

## Deployment

### Backend Deployment Options

**Option 1: Heroku**
```bash
cd clockit_api
heroku create clockit-api
heroku config:set FIREBASE_SERVICE_ACCOUNT_B64="<your_value>"
heroku config:set ALLOWED_ORIGINS="https://your-frontend.com"
git push heroku main
```

**Option 2: Google Cloud Run**
```bash
gcloud run deploy clockit-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

**Option 3: Railway**
1. Connect GitHub repo
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Frontend Deployment

Update `NEXT_PUBLIC_API_URL` to production backend URL:

```env
# .env.production
NEXT_PUBLIC_API_URL=https://api.clockit.com/api/v1
```

Deploy to Vercel/Netlify as usual.

---

## Common Issues & Solutions

### Issue: CORS errors
**Solution:** Ensure `ALLOWED_ORIGINS` includes your frontend URL

### Issue: 401 Unauthorized
**Solution:** Check Firebase ID token is being sent in Authorization header

### Issue: Firebase Admin SDK errors
**Solution:** Verify `FIREBASE_SERVICE_ACCOUNT_B64` is correctly encoded

### Issue: Rate limit errors
**Solution:** Adjust `RATE_LIMIT_MAX_REQUESTS` or implement exponential backoff

---

## Rollback Plan

If issues arise during migration:

1. **Keep old code:** Original files remain until migration is verified
2. **Feature flags:** Wrap new API calls with feature flags
3. **Gradual rollout:** Enable API for subset of users first
4. **Monitoring:** Add logging to track API vs. direct Firestore usage

Example rollback:
```typescript
const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';

if (USE_API) {
  await tokensApi.create(data);
} else {
  // Old Firestore code
}
```

---

## Next Steps

1. **Start backend server** and verify health endpoint
2. **Test Phase 1** (API tokens) thoroughly
3. **Plan Phase 2** (Goals) implementation
4. **Set up CI/CD** for backend
5. **Add monitoring** (error tracking, performance metrics)

---

## Questions?

For help with migration:
- Review backend README: `clockit_api/README.md`
- Check API documentation in backend routes
- Review refactored examples in `*.refactored.tsx` files
