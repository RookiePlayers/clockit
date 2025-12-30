# Role-Based Access Control (RBAC) Guide

This guide explains how to use the RBAC system implemented with Firebase Auth Custom Claims, Firestore, and CASL.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Roles and Permissions](#roles-and-permissions)
- [Frontend Usage](#frontend-usage)
- [Backend Usage](#backend-usage)
- [API Endpoints](#api-endpoints)
- [Examples](#examples)

## Overview

The RBAC system provides fine-grained access control using:
- **Firebase Auth Custom Claims** - Store user roles in JWT tokens
- **Firestore** - Persist role assignments for querying
- **CASL** - Define and check permissions with a powerful ability system

## Architecture

```
┌─────────────────┐
│   Frontend      │
│                 │
│  ┌───────────┐  │
│  │   CASL    │  │ ← Ability definitions
│  │  Ability  │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ Firebase  │  │ ← Read custom claims
│  │   Auth    │  │   from ID token
│  └───────────┘  │
└────────┬────────┘
         │
    HTTP │ API Requests
         │
┌────────▼────────┐
│   Backend       │
│                 │
│  ┌───────────┐  │
│  │   RBAC    │  │ ← Set custom claims
│  │  Service  │  │   via Firebase Admin
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ Firestore │  │ ← Store role assignments
│  └───────────┘  │
└─────────────────┘
```

## Roles and Permissions

### Available Roles

| Role | Description |
|------|-------------|
| `ADMIN` | Full system access - can manage all resources |
| `USER` | Standard user - can manage their own resources |
| `GUEST` | Limited read-only access |
| `TEAM_ADMIN` | Can manage team resources and invite members |
| `TEAM_MEMBER` | Can view team resources and contribute |

### Permission Model

Permissions follow the format: `action` + `subject`

**Actions:**
- `create` - Create new resources
- `read` - View resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `manage` - All actions (admin shortcut)
- `upload`, `download`, `share`, `export`, `invite` - Specific actions

**Subjects:**
- `Upload`, `Session`, `Goal`, `GoalGroup`, `Stats`, `Achievement`
- `User`, `Team`, `Workspace`, `Settings`
- `all` - All subjects (admin shortcut)

### Default Permissions by Role

#### ADMIN
```typescript
{ action: 'manage', subject: 'all' } // Can do everything
```

#### USER
```typescript
// Can manage own uploads
{ action: 'create', subject: 'Upload' }
{ action: 'read', subject: 'Upload' }
{ action: 'update', subject: 'Upload' }
{ action: 'delete', subject: 'Upload' }

// Can manage own sessions
{ action: 'create', subject: 'Session' }
{ action: 'read', subject: 'Session' }
{ action: 'update', subject: 'Session' }
{ action: 'delete', subject: 'Session' }

// Can manage own goals
{ action: 'create', subject: 'Goal' }
{ action: 'read', subject: 'Goal' }
{ action: 'update', subject: 'Goal' }
{ action: 'delete', subject: 'Goal' }

// Can view stats
{ action: 'read', subject: 'Stats' }
{ action: 'read', subject: 'Achievement' }

// Can manage own settings
{ action: 'read', subject: 'Settings' }
{ action: 'update', subject: 'Settings' }
```

#### GUEST
```typescript
{ action: 'read', subject: 'Stats' } // Read-only stats access
```

## Frontend Usage

### 1. Setup AbilityProvider

Wrap your app with the `AbilityProvider`:

```tsx
// app/layout.tsx or _app.tsx
import { AbilityProvider } from '@/lib/rbac';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AbilityProvider>
          {children}
        </AbilityProvider>
      </body>
    </html>
  );
}
```

### 2. Using Hooks

```tsx
import { useCan, useRole, useIsAdmin } from '@/lib/rbac';

function MyComponent() {
  const canCreateUpload = useCan('create', 'Upload');
  const role = useRole();
  const isAdmin = useIsAdmin();

  return (
    <div>
      <p>Your role: {role}</p>
      {canCreateUpload && <button>Upload CSV</button>}
      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

### 3. Using Components

```tsx
import { Can, Cannot, RequireRole, RequireAuth } from '@/lib/rbac';
import { Role } from '@/lib/rbac';

function Dashboard() {
  return (
    <div>
      {/* Show button only if user can create uploads */}
      <Can I="create" a="Upload">
        <button>Upload CSV</button>
      </Can>

      {/* Show message if user cannot delete */}
      <Cannot I="delete" a="Upload">
        <p>You don't have permission to delete uploads</p>
      </Cannot>

      {/* Admin-only section */}
      <RequireRole role={Role.ADMIN}>
        <AdminSettings />
      </RequireRole>

      {/* Multiple roles */}
      <RequireRole role={[Role.ADMIN, Role.TEAM_ADMIN]}>
        <ManageTeam />
      </RequireRole>

      {/* Authenticated users only */}
      <RequireAuth fallback={<SignInPrompt />}>
        <UserDashboard />
      </RequireAuth>
    </div>
  );
}
```

### 4. Checking Permissions Programmatically

```tsx
import { useAbility } from '@/lib/rbac';

function FileManager() {
  const { ability } = useAbility();

  const handleDelete = (fileId: string) => {
    if (!ability.can('delete', 'Upload')) {
      alert('You do not have permission to delete');
      return;
    }
    // Proceed with delete
  };

  return <FileList onDelete={handleDelete} />;
}
```

## Backend Usage

### 1. Setting User Roles

```typescript
import { RBACService } from '@/services/rbac.service';
import { Role } from '@/types/rbac.types';

// Assign a role to a user
await RBACService.setUserRole({
  userId: 'user123',
  role: Role.ADMIN,
});

// Assign team admin
await RBACService.setUserRole({
  userId: 'user456',
  role: Role.TEAM_ADMIN,
  teamId: 'team789',
});
```

### 2. Checking Permissions

```typescript
import { RBACService } from '@/services/rbac.service';

// Check if user has permission
const canUpload = await RBACService.hasPermission(
  userId,
  'create',
  'Upload'
);

if (!canUpload) {
  throw new Error('Permission denied');
}
```

### 3. Middleware for Route Protection

Create a permission middleware:

```typescript
// middleware/require-permission.ts
import { RBACService } from '@/services/rbac.service';
import type { AuthenticatedRequest } from '@/types/auth.types';

export function requirePermission(action: string, subject: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.uid;
    const hasPermission = await RBACService.hasPermission(userId, action, subject);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `You don't have permission to ${action} ${subject}`,
        },
      });
    }

    next();
  };
}

// Use in routes
router.post(
  '/uploads',
  authenticate,
  requirePermission('create', 'Upload'),
  asyncHandler(UploadsController.create)
);
```

## API Endpoints

### Get My Role
```http
GET /api/rbac/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "role": "user",
    "permissions": [...]
  }
}
```

### Set User Role (Admin Only)
```http
POST /api/rbac/users/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user123",
  "role": "admin",
  "teamId": "team456" // optional
}
```

### Get User's Role
```http
GET /api/rbac/users/:userId/role
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "role": "user",
    "permissions": [...]
  }
}
```

### List Users with Roles (Admin Only)
```http
GET /api/rbac/users
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "users": [
      {
        "uid": "user123",
        "email": "user@example.com",
        "role": "admin"
      }
    ]
  }
}
```

### Check Permission
```http
POST /api/rbac/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "create",
  "subject": "Upload"
}

Response:
{
  "success": true,
  "data": {
    "hasPermission": true
  }
}
```

## Examples

### Example 1: Upload Button with Permission Check

```tsx
import { Can } from '@/lib/rbac';

function UploadSection() {
  return (
    <div>
      <h2>Upload Files</h2>
      <Can I="create" a="Upload" fallback={
        <p className="text-red-500">
          You need permission to upload files. Contact your admin.
        </p>
      }>
        <UploadButton />
      </Can>
    </div>
  );
}
```

### Example 2: Admin Dashboard

```tsx
import { RequireRole, Role } from '@/lib/rbac';
import { useRouter } from 'next/navigation';

function AdminDashboard() {
  const router = useRouter();

  return (
    <RequireRole
      role={Role.ADMIN}
      fallback={
        <div>
          <p>Access Denied</p>
          <button onClick={() => router.push('/')}>Go Home</button>
        </div>
      }
    >
      <div>
        <h1>Admin Dashboard</h1>
        <UserManagement />
        <SystemSettings />
      </div>
    </RequireRole>
  );
}
```

### Example 3: Assigning Roles via API

```typescript
import { rbacApi } from '@/lib/api-client';
import { Role } from '@/lib/rbac';

async function promoteToAdmin(userId: string) {
  try {
    await rbacApi.setUserRole(userId, Role.ADMIN);
    console.log('User promoted to admin');
  } catch (error) {
    console.error('Failed to promote user:', error);
  }
}
```

### Example 4: Backend Permission Check

```typescript
// In a controller
import { RBACService } from '@/services/rbac.service';

export class UploadsController {
  static async deleteUpload(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.uid;
    const { uploadId } = req.params;

    // Check permission
    const canDelete = await RBACService.hasPermission(userId, 'delete', 'Upload');

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You cannot delete uploads',
        },
      });
    }

    // Proceed with deletion
    await UploadsService.delete(uploadId, userId);
    return successResponse(res, { deleted: true });
  }
}
```

## Best Practices

1. **Always check permissions on both frontend and backend**
   - Frontend checks for UX (hide buttons, show messages)
   - Backend checks for security (enforce access control)

2. **Use specific permissions instead of role checks**
   ```tsx
   // ✅ Good - flexible, role-agnostic
   <Can I="delete" a="Upload">
     <DeleteButton />
   </Can>

   // ❌ Bad - tightly coupled to roles
   {role === Role.ADMIN && <DeleteButton />}
   ```

3. **Refresh user token after role changes**
   ```typescript
   // After changing role
   await user.getIdToken(true); // Force refresh
   ```

4. **Use middleware for route protection**
   ```typescript
   router.post('/uploads',
     authenticate,
     requirePermission('create', 'Upload'),
     asyncHandler(handler)
   );
   ```

5. **Handle permission errors gracefully**
   ```tsx
   <Can I="create" a="Upload" fallback={
     <Alert>Contact admin to request upload permissions</Alert>
   }>
     <UploadForm />
   </Can>
   ```

## Troubleshooting

### Permissions not updating after role change
**Solution:** Force token refresh on the client:
```typescript
const user = auth.currentUser;
if (user) {
  await user.getIdToken(true);
  window.location.reload();
}
```

### "Cannot read property 'can' of undefined"
**Solution:** Ensure `AbilityProvider` wraps your component tree.

### 403 Forbidden on API calls
**Solution:** Check that:
1. User is authenticated
2. User has the required role/permissions
3. Custom claims are set correctly in Firebase
