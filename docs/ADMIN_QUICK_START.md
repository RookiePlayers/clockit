# Admin Creation - Quick Start

## TL;DR - Create Your First Admin

### Option 1: CLI (Easiest for Development)

```bash
# 1. User signs up in your app
# 2. Run this command
cd clockit_api
npm run create-admin user@example.com

# 3. User signs out and back in
# ✅ Done!
```

### Option 2: HTTP API (For Production)

```bash
# 1. Set in .env
ENABLE_ADMIN_SETUP=true
ADMIN_SETUP_TOKEN=your-secret-token

# 2. User signs up in your app
# 3. Call API
curl -X POST http://localhost:3001/api/admin-setup/create-first-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "setupToken": "your-secret-token"}'

# 4. Disable setup in .env
ENABLE_ADMIN_SETUP=false

# ✅ Done!
```

## All Admin Commands

```bash
# Create admin
npm run create-admin <email>

# List all admins
npm run list-admins

# Remove admin (revert to user)
npm run remove-admin <email>
```

## Environment Variables

Add to `.env`:

```bash
# Enable setup endpoints (disable after first admin)
ENABLE_ADMIN_SETUP=true

# Secret token for setup (change this!)
ADMIN_SETUP_TOKEN=change-me-in-production

# Initial admin emails (optional)
INITIAL_ADMIN_EMAILS=admin@example.com,admin2@example.com
```

## API Endpoints

### Setup Endpoints (No Auth Required)

```bash
# Check status
GET /api/admin-setup/status

# Create first admin
POST /api/admin-setup/create-first-admin
Body: { "email": "admin@example.com", "setupToken": "token" }

# Init from env
POST /api/admin-setup/init-from-env
Body: { "setupToken": "token" }
```

### RBAC Endpoints (Auth Required - Admin Only)

```bash
# Get my role
GET /api/rbac/me
Headers: Authorization: Bearer <token>

# Set user role
POST /api/rbac/users/role
Headers: Authorization: Bearer <admin-token>
Body: { "userId": "uid", "role": "admin" }

# List users with roles
GET /api/rbac/users
Headers: Authorization: Bearer <admin-token>
```

## Security Checklist

- [ ] User has signed up first
- [ ] Changed `ADMIN_SETUP_TOKEN` from default
- [ ] Set `ENABLE_ADMIN_SETUP=false` after first admin
- [ ] Admin user signed out and back in (to refresh token)
- [ ] Verified admin access works
- [ ] Removed sensitive tokens from Git

## Common Issues

**"No user found"** → User must sign up first
**"Invalid setup token"** → Check `.env` file
**"Admin already exists"** → Use RBAC API instead
**"Setup disabled"** → Set `ENABLE_ADMIN_SETUP=true`
**"Permissions not updating"** → User must sign out/in

## Next Steps

After creating your first admin:

1. ✅ User signs out and back in
2. ✅ Set `ENABLE_ADMIN_SETUP=false` in `.env`
3. ✅ Use RBAC API for future role changes
4. ✅ Read full guide: `ADMIN_SETUP.md`
5. ✅ Read RBAC guide: `RBAC_GUIDE.md`

---

**Need more details?** See [ADMIN_SETUP.md](./ADMIN_SETUP.md)
