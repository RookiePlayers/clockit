# Quick Start Guide - Backend Refactoring

Get the new backend/frontend architecture running in 10 minutes.

## Prerequisites

- Node.js 18+ installed
- Firebase project with Firestore enabled
- Firebase service account JSON

---

## Step 1: Get Firebase Service Account (2 min)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click ⚙️ Settings → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate New Private Key"
6. Save the JSON file

**Encode it to base64:**

**Mac/Linux:**
```bash
cat path/to/service-account.json | base64 | tr -d '\n'
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\service-account.json"))
```

Copy the output - you'll need it next.

---

## Step 2: Setup Backend (3 min)

```bash
cd clockit_api

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local
# Paste your base64 service account from Step 1
```

Edit `.env.local`:
```env
NODE_ENV=development
PORT=3001
FIREBASE_SERVICE_ACCOUNT_B64=<paste_here>
ALLOWED_ORIGINS=http://localhost:3000
```

**Verify environment setup:**
```bash
npm run check-env
```

This will verify your `.env.local` file is configured correctly.

**Start the server:**
```bash
npm run dev
```

You should see:
```
Server running on port 3001 in development mode
API available at http://localhost:3001/api/v1
```

**Test it works:**
```bash
curl http://localhost:3001/api/v1/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-..."}
```

✅ **Backend is running!**

---

## Step 3: Setup Frontend (2 min)

Open a **new terminal window**.

```bash
cd clockit_website

# Add API URL to environment
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1" >> .env.local

# Start development server
npm run dev
```

Frontend should start on `http://localhost:3000`

✅ **Frontend is running!**

---

## Step 4: Test the Integration (3 min)

1. **Open browser:** http://localhost:3000

2. **Sign in** with your Firebase account

3. **Go to Profile:** http://localhost:3000/profile

4. **Create an API token:**
   - Enter name: "Test Token"
   - Enter days: 90
   - Click "Create token"

5. **Check Network tab in DevTools:**
   - Should see `POST http://localhost:3001/api/v1/tokens`
   - Should have `Authorization: Bearer ...` header
   - Should get 201 response with token

6. **Verify token appears in list**

7. **Test revoke:**
   - Click "Revoke" on a token
   - Should see `DELETE http://localhost:3001/api/v1/tokens/{id}`
   - Token should disappear from list

✅ **Everything works!**

---

## Troubleshooting

### Backend won't start

**Error: "Missing environment variables"**
- Check `.env.local` exists in `clockit_api/`
- Verify `FIREBASE_SERVICE_ACCOUNT_B64` is set

**Error: "Invalid service account"**
- Re-encode the JSON (no newlines!)
- Verify JSON is valid Firebase service account

### Frontend can't connect

**Error: "CORS policy"**
- Check `ALLOWED_ORIGINS` includes `http://localhost:3000`
- Restart backend after changing env vars

**Error: "Network error"**
- Verify backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`

### Authentication fails

**Error: "401 Unauthorized"**
- Make sure you're signed in
- Check Firebase token in Authorization header
- Verify service account has correct permissions

### Still stuck?

1. Check both terminal windows for error messages
2. Review `.env.local` files match examples
3. Ensure Firebase project is active
4. Try restarting both servers

---

## Next Steps

### Apply the refactored code

Once everything works:

```bash
cd clockit_website/src/app/profile

# Backup original
mv page.tsx page.backup.tsx

# Use refactored version
mv page.refactored.tsx page.tsx

# Restart frontend
# Ctrl+C in frontend terminal
npm run dev
```

### Explore the code

**Backend structure:**
```
clockit_api/src/
├── routes/tokens.routes.ts    # API endpoints
├── controllers/tokens.controller.ts  # Request handling
├── services/token.service.ts  # Business logic
└── middleware/auth.ts         # Authentication
```

**Frontend changes:**
```
clockit_website/src/
└── lib/api-client.ts          # API calls
```

### Read the docs

- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Complete migration plan
- [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) - Overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [clockit_api/README.md](clockit_api/README.md) - Backend docs

### Plan Phase 2

Review the migration guide for next features:
- Goals Management
- Sessions Management
- CSV Uploads
- Feature Flags

---

## Architecture at a Glance

```
┌───────────────┐
│  Browser      │  http://localhost:3000
│  (Frontend)   │
└───────┬───────┘
        │ API Calls
        │ Authorization: Bearer <firebase-token>
        ▼
┌───────────────┐
│  Express      │  http://localhost:3001
│  (Backend)    │
└───────┬───────┘
        │ Firebase Admin SDK
        ▼
┌───────────────┐
│  Firestore    │  Firebase Project
│  (Database)   │
└───────────────┘
```

**What changed:**
- ❌ **Before:** Frontend → Firestore directly
- ✅ **After:** Frontend → API → Firestore

**Benefits:**
- Secure server-side operations
- Centralized business logic
- Better error handling
- Easy to test
- Scalable architecture

---

## Summary

You now have:
✅ Backend API running on port 3001
✅ Frontend running on port 3000
✅ Secure authentication with Firebase
✅ Working API tokens feature
✅ Clean separation of concerns

**Time to complete:** ~10 minutes
**Files changed:** 3 (`.env.local` files + optional page.tsx)
**New code:** Backend API server + API client

---

## Common Commands

**Backend:**
```bash
cd clockit_api
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Run production server
npm test           # Run tests (when added)
```

**Frontend:**
```bash
cd clockit_website
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Run production server
```

**Both:**
```bash
# Terminal 1
cd clockit_api && npm run dev

# Terminal 2
cd clockit_website && npm run dev
```

---

Happy coding! 🚀

For questions or issues, review the detailed guides in the root directory.
