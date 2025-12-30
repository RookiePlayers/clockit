# Admin Setup Guide

This guide explains all the ways to create admin users in the Clockit system.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Method 1: CLI Scripts (Recommended for Development)](#method-1-cli-scripts-recommended-for-development)
- [Method 2: HTTP API (For Automation)](#method-2-http-api-for-automation)
- [Method 3: Direct Firebase Admin SDK](#method-3-direct-firebase-admin-sdk)
- [Method 4: Environment Variable (For Initial Deployment)](#method-4-environment-variable-for-initial-deployment)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before creating an admin, ensure:
1. ✅ The user has signed up in your app (user exists in Firebase Auth)
2. ✅ You have the user's email address
3. ✅ Firebase Admin SDK is configured correctly
4. ✅ Backend server is running (for HTTP methods)

## Method 1: CLI Scripts (Recommended for Development)

### Create Admin

```bash
cd clockit_api
npm run create-admin <email>
```

**Example:**
```bash
npm run create-admin admin@example.com
```

**Output:**
```
🔍 Looking up user with email: admin@example.com
✅ Found user: abc123xyz
🔐 Setting admin role...
✅ Successfully granted admin privileges!

Admin Details:
  Email: admin@example.com
  UID: abc123xyz
  Role: admin

⚠️  User needs to refresh their token to see changes.
   They can do this by signing out and signing back in.

✨ Done!
```

### List All Admins

```bash
npm run list-admins
```

**Output:**
```
🔍 Fetching all users with roles...

✅ Found 2 admins:

1. admin@example.com
   UID: abc123xyz
   Role: admin

2. superadmin@example.com
   UID: def456uvw
   Role: admin

Total: 2 admins

✨ Done!
```

### Remove Admin Role

```bash
npm run remove-admin <email>
```

**Example:**
```bash
npm run remove-admin admin@example.com
```

## Method 2: HTTP API (For Automation)

### Setup Status

Check if any admins exist:

```bash
curl http://localhost:3001/api/admin-setup/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "needsSetup": true,
    "adminCount": 0,
    "totalUsers": 5
  }
}
```

### Create First Admin

**Requirements:**
- No admins exist yet
- `ENABLE_ADMIN_SETUP=true` in `.env`
- Valid setup token

```bash
curl -X POST http://localhost:3001/api/admin-setup/create-first-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "setupToken": "change-me-in-production"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "First admin created successfully",
    "user": {
      "uid": "abc123xyz",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

### Initialize from Environment Variable

Bulk create admins from `INITIAL_ADMIN_EMAILS` env var:

```bash
curl -X POST http://localhost:3001/api/admin-setup/init-from-env \
  -H "Content-Type: application/json" \
  -d '{
    "setupToken": "change-me-in-production"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Created 3 admin(s)",
    "results": {
      "success": [
        "admin1@example.com",
        "admin2@example.com",
        "admin3@example.com"
      ],
      "failed": []
    }
  }
}
```

## Method 3: Direct Firebase Admin SDK

For programmatic admin creation in your own scripts:

```typescript
import { getAuth } from '@/config/firebase-admin';
import { RBACService } from '@/services/rbac.service';
import { Role } from '@/types/rbac.types';

async function createAdmin(email: string) {
  const adminAuth = getAuth();

  // Get user by email
  const userRecord = await adminAuth.getUserByEmail(email);

  // Set admin role
  await RBACService.setUserRole({
    userId: userRecord.uid,
    role: Role.ADMIN,
  });

  console.log(`Admin created: ${email}`);
}

// Usage
createAdmin('admin@example.com');
```

## Method 4: Environment Variable (For Initial Deployment)

Perfect for automated deployments and Docker containers.

### 1. Configure Environment

Add to your `.env` file:

```bash
# Enable admin setup routes
ENABLE_ADMIN_SETUP=true

# Setup token (use a strong random value in production!)
ADMIN_SETUP_TOKEN=your-secure-random-token-here

# Comma-separated admin emails
INITIAL_ADMIN_EMAILS=admin1@example.com,admin2@example.com,admin3@example.com
```

### 2. Call Initialization Endpoint

After deployment, make a POST request:

```bash
curl -X POST https://your-api.com/api/admin-setup/init-from-env \
  -H "Content-Type: application/json" \
  -d '{
    "setupToken": "your-secure-random-token-here"
  }'
```

### 3. Disable Setup Routes (Production)

After initial setup, **disable** the setup routes:

```bash
# .env
ENABLE_ADMIN_SETUP=false
```

Restart your server. Setup routes will now return 404.

## Using RBAC API (After First Admin)

Once you have at least one admin, use the RBAC API for all subsequent role management:

### Set User Role (Admin Only)

```bash
curl -X POST http://localhost:3001/api/rbac/users/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "userId": "user123",
    "role": "admin"
  }'
```

### List All Users with Roles (Admin Only)

```bash
curl http://localhost:3001/api/rbac/users \
  -H "Authorization: Bearer <admin-token>"
```

### Remove User Role (Admin Only)

```bash
curl -X DELETE http://localhost:3001/api/rbac/users/user123/role \
  -H "Authorization: Bearer <admin-token>"
```

## Security Considerations

### ⚠️ Production Security Checklist

1. **Change the setup token**
   ```bash
   # Generate a secure random token
   openssl rand -hex 32
   # Use this as ADMIN_SETUP_TOKEN
   ```

2. **Disable setup routes after initial admin creation**
   ```bash
   ENABLE_ADMIN_SETUP=false
   ```

3. **Use strong, unique admin credentials**
   - Don't use common emails like `admin@company.com`
   - Enable 2FA for admin accounts

4. **Restrict API access**
   - Use firewall rules to limit setup endpoint access
   - Only allow from trusted IPs during setup

5. **Audit admin actions**
   - Monitor who gets admin access
   - Log all role changes

6. **Rotate setup tokens**
   - Change `ADMIN_SETUP_TOKEN` after initial setup
   - Don't commit tokens to version control

### Best Practices

✅ **DO:**
- Create your first admin during initial deployment
- Use CLI scripts in development
- Disable setup routes in production
- Keep setup tokens secret
- Audit admin access regularly

❌ **DON'T:**
- Leave setup routes enabled in production
- Use weak setup tokens
- Share setup tokens publicly
- Commit tokens to Git
- Create too many admin accounts

## Token Refresh

After role changes, users need to refresh their Firebase Auth token:

### Frontend (User Side)

```typescript
import { auth } from '@/lib/firebase';

async function refreshToken() {
  const user = auth.currentUser;
  if (user) {
    // Force token refresh
    await user.getIdToken(true);

    // Optionally reload the page
    window.location.reload();
  }
}
```

### Automatic Refresh

Users can simply sign out and sign back in to get the updated role.

## Troubleshooting

### Error: "No user found with email"

**Problem:** User doesn't exist in Firebase Auth

**Solution:**
1. User must sign up in your app first
2. Verify email address is correct
3. Check Firebase Console for user existence

### Error: "Admin users already exist"

**Problem:** Trying to use `/create-first-admin` when admins already exist

**Solution:** Use the RBAC API instead:
```bash
curl -X POST http://localhost:3001/api/rbac/users/role \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"userId": "user123", "role": "admin"}'
```

### Error: "Invalid setup token"

**Problem:** Wrong `ADMIN_SETUP_TOKEN` value

**Solution:**
1. Check `.env` file for correct token
2. Ensure no extra spaces or quotes
3. Restart server after changing `.env`

### Error: "Admin setup routes are disabled"

**Problem:** `ENABLE_ADMIN_SETUP=false` or not set

**Solution:**
```bash
# In .env
ENABLE_ADMIN_SETUP=true
```
Then restart the server.

### Permissions Not Updating

**Problem:** User still sees old role after admin creation

**Solution:**
1. User must refresh their auth token:
   - Sign out and sign back in, OR
   - Call `user.getIdToken(true)` to force refresh
2. Clear browser cache if needed
3. Check custom claims in Firebase Console

### Can't Access Admin Panel

**Problem:** Admin role set but UI doesn't show admin features

**Solution:**
1. Verify role was set correctly:
   ```bash
   npm run list-admins
   ```
2. Check user refreshed their token
3. Verify `AbilityProvider` is wrapping your app
4. Check browser console for errors

## Verification

After creating an admin, verify it worked:

### 1. Check via CLI
```bash
npm run list-admins
```

### 2. Check via API
```bash
curl http://localhost:3001/api/rbac/users \
  -H "Authorization: Bearer <admin-token>"
```

### 3. Check Firebase Console
Go to Firebase Console → Authentication → Users → Click on user → Custom Claims tab

Should see:
```json
{
  "role": "admin",
  "permissions": [...]
}
```

### 4. Test in Frontend
```tsx
import { useRole, useIsAdmin } from '@/lib/rbac';

function MyComponent() {
  const role = useRole();
  const isAdmin = useIsAdmin();

  console.log('Role:', role); // Should log "admin"
  console.log('Is Admin:', isAdmin); // Should log true
}
```

## Examples

### Example 1: Local Development Setup

```bash
# 1. User signs up in app
# 2. Create admin via CLI
cd clockit_api
npm run create-admin dev@localhost

# 3. User signs out and back in
# 4. Verify
npm run list-admins
```

### Example 2: Production Deployment

```bash
# 1. Set environment variables
export ENABLE_ADMIN_SETUP=true
export ADMIN_SETUP_TOKEN=$(openssl rand -hex 32)
export INITIAL_ADMIN_EMAILS=admin@company.com,backup@company.com

# 2. Deploy application
# 3. Users sign up
# 4. Initialize admins
curl -X POST https://api.company.com/api/admin-setup/init-from-env \
  -d "{\"setupToken\": \"$ADMIN_SETUP_TOKEN\"}"

# 5. Disable setup routes
export ENABLE_ADMIN_SETUP=false

# 6. Redeploy
```

### Example 3: CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
- name: Initialize Admin Users
  run: |
    curl -X POST ${{ secrets.API_URL }}/api/admin-setup/init-from-env \
      -H "Content-Type: application/json" \
      -d "{\"setupToken\": \"${{ secrets.ADMIN_SETUP_TOKEN }}\"}"
  env:
    API_URL: ${{ secrets.API_URL }}
```

## Summary

| Method | Use Case | Security | Ease of Use |
|--------|----------|----------|-------------|
| CLI Scripts | Development, quick admin creation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| HTTP API | Automation, CI/CD | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Direct SDK | Custom scripts | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Environment Variable | Initial deployment | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| RBAC API | Production role management | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**Recommendation:**
- **Development:** Use CLI scripts
- **Production (first time):** Use environment variable + HTTP API
- **Production (ongoing):** Use RBAC API with admin authentication
