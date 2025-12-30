# Admin Feature Bypass

## Overview

Admins (users with `ADMIN` or `SUPER_ADMIN` roles) have **global access to all features**, completely bypassing the feature flags system.

## How It Works

### Architecture

```
User Authentication
    ↓
Get Firebase Custom Claims
    ↓
Check User Role
    ├─ Role = ADMIN or SUPER_ADMIN
    │   └─ isAdmin = true
    │       └─ All feature checks return TRUE ✅
    │
    └─ Role = USER, GUEST, etc.
        └─ isAdmin = false
            └─ Normal feature flag checks apply
```

### Implementation Details

1. **Admin Detection** - [FeatureFlagsContext.tsx:175-203](clockit_website/src/contexts/FeatureFlagsContext.tsx#L175-L203)
   - Fetches user role from Firebase custom claims
   - Sets `isAdmin = true` for ADMIN or SUPER_ADMIN roles
   - Automatically updates when userId changes

2. **Feature Check Bypass** - [FeatureFlagsContext.tsx:228-240](clockit_website/src/contexts/FeatureFlagsContext.tsx#L228-L240)
   - `isFeatureEnabled()` returns `true` for admins
   - `isGroupEnabled()` returns `true` for admins
   - Bypasses API calls and entitlement checks

3. **Hook Integration** - [useFeature.ts:23,55](clockit_website/src/hooks/useFeature.ts#L23)
   - Exposes `isAdmin` flag to components
   - Allows conditional UI rendering based on admin status

## Usage

### Basic Usage

```typescript
import { useFeature } from "@/hooks/useFeature";

function MyComponent() {
  const { isFeatureEnabled, isAdmin } = useFeature();

  // Admin users will ALWAYS get true
  const canUseFeature = isFeatureEnabled("clockit-online");

  return (
    <div>
      {isAdmin && <p>You are an admin with full access!</p>}
      {canUseFeature ? <Feature /> : <Locked />}
    </div>
  );
}
```

### Advanced Usage

```typescript
function AdminOnlyFeature() {
  const { isAdmin, isFeatureEnabled } = useFeature();

  // Show admin-only UI
  if (isAdmin) {
    return (
      <div>
        <h2>Admin Panel</h2>
        <p>You have access to all features</p>
        <AdminControls />
      </div>
    );
  }

  // Regular users go through normal feature checks
  const canUse = isFeatureEnabled("admin-panel");
  return canUse ? <AdminPanel /> : <AccessDenied />;
}
```

### Conditional Rendering

```typescript
function FeatureGate() {
  const { isFeatureEnabled, isAdmin } = useFeature();

  return (
    <div>
      {/* Admins always see this */}
      {isFeatureEnabled("premium-feature") && (
        <PremiumFeature />
      )}

      {/* Show admin badge */}
      {isAdmin && (
        <Badge variant="admin">Admin Access</Badge>
      )}
    </div>
  );
}
```

## API Reference

### useFeature Hook

```typescript
const {
  isFeatureEnabled,  // (feature: string) => boolean
  isGroupEnabled,    // (group: string) => boolean
  isAdmin,           // boolean - true for ADMIN/SUPER_ADMIN
  entitlement,       // User's feature entitlement
  featureGroups,     // Available feature groups
  loading,           // Loading state
  error,             // Error if any
  clearCache,        // Clear cache function
  refetch,           // Force refetch function
} = useFeature();
```

### Admin Detection

```typescript
// Check if user is admin
const { isAdmin } = useFeature();

if (isAdmin) {
  console.log("User has global access to all features");
}
```

## Roles That Get Bypass

Only these roles bypass feature flags:

- ✅ `Role.SUPER_ADMIN` - Super administrators
- ✅ `Role.ADMIN` - Administrators

These roles follow normal feature flags:

- ❌ `Role.USER` - Regular users
- ❌ `Role.GUEST` - Guest users
- ❌ `Role.TEAM_ADMIN` - Team administrators
- ❌ `Role.TEAM_MEMBER` - Team members

## Setting Admin Role

To grant admin access to a user, set their role in Firebase custom claims:

### Backend (Firebase Admin SDK)

```typescript
import { auth } from "firebase-admin";

// Set user as admin
await auth.setCustomUserClaims(userId, {
  role: "admin"
});

// Set user as super admin
await auth.setCustomUserClaims(userId, {
  role: "super_admin"
});
```

### Using RBAC API

```typescript
import { rbacApi } from "@/lib/api-client";

// Set user role via API
await rbacApi.setUserRole(userId, "admin");

// Set super admin role
await rbacApi.setUserRole(userId, "super_admin");
```

## Security Considerations

### ✅ Safe

- Admin status is verified via Firebase custom claims (server-side)
- Custom claims are signed by Firebase and cannot be tampered with client-side
- Role changes require backend Firebase Admin SDK or authenticated API calls
- Admin detection happens on every user ID change

### ⚠️ Important

- **Always verify admin permissions on the backend** for sensitive operations
- Client-side feature flags are for UI gating only
- Don't rely solely on client-side checks for security
- Always validate user permissions on API endpoints

### Backend Verification Example

```typescript
// Backend API endpoint
export async function deleteFeatureGroup(req: AuthenticatedRequest, res: Response) {
  const user = req.user;

  // Verify admin role on backend
  if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
    return errorResponse(res, 403, 'FORBIDDEN', 'Admin access required');
  }

  // Proceed with deletion
  await FeatureGroupService.deleteFeatureGroup(req.params.id);
  return successResponse(res, { message: 'Deleted' });
}
```

## Testing

### Manual Testing

1. **Test Admin Access**:
   ```bash
   # 1. Set your user as admin via Firebase console or backend API
   # 2. Login to the app
   # 3. Open browser console
   # 4. Check admin status
   ```

   ```typescript
   // In browser console
   const { isAdmin, isFeatureEnabled } = useFeature();
   console.log("Is Admin:", isAdmin); // Should be true
   console.log("Can use feature:", isFeatureEnabled("any-feature")); // Should be true
   ```

2. **Test Non-Admin Access**:
   ```bash
   # 1. Login as regular user
   # 2. Open browser console
   # 3. Verify normal feature flag behavior
   ```

   ```typescript
   // In browser console
   const { isAdmin, isFeatureEnabled } = useFeature();
   console.log("Is Admin:", isAdmin); // Should be false
   console.log("Can use feature:", isFeatureEnabled("locked-feature")); // Should be false
   ```

### Automated Testing

```typescript
import { render } from '@testing-library/react';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';

// Mock Firebase auth
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdTokenResult: async () => ({
        claims: { role: 'admin' }
      })
    }
  }
}));

test('admin users bypass feature flags', async () => {
  const { result } = renderHook(() => useFeature(), {
    wrapper: ({ children }) => (
      <FeatureFlagsProvider userId="admin-user-123">
        {children}
      </FeatureFlagsProvider>
    )
  });

  await waitFor(() => {
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isFeatureEnabled('any-feature')).toBe(true);
  });
});
```

## Debugging

### Check Admin Status

```typescript
import { useFeature } from "@/hooks/useFeature";

function DebugPanel() {
  const { isAdmin, entitlement, isFeatureEnabled } = useFeature();

  return (
    <div>
      <h3>Debug Info</h3>
      <p>Is Admin: {isAdmin ? "YES" : "NO"}</p>
      <p>Entitlement: {entitlement.name}</p>
      <p>Can use feature: {isFeatureEnabled("test") ? "YES" : "NO"}</p>
    </div>
  );
}
```

### Verify Firebase Claims

```typescript
// In browser console or React component
import { auth } from "@/lib/firebase";

const user = auth.currentUser;
if (user) {
  const token = await user.getIdTokenResult();
  console.log("User Role:", token.claims.role);
  console.log("All Claims:", token.claims);
}
```

### Force Refresh Token

```typescript
// Force Firebase to refresh the ID token
const user = auth.currentUser;
if (user) {
  const token = await user.getIdToken(true); // true = force refresh
  console.log("Token refreshed");
}
```

## Performance

### No Additional API Calls

- Admin status is checked using existing Firebase auth
- No additional API calls for feature flags if admin
- Same caching behavior as regular users

### Cache Behavior

```typescript
// Admin user
Page Load → Check Firebase claims → isAdmin = true
Navigate → All feature checks return true (instant) ⚡

// Regular user
Page Load → Check Firebase claims → isAdmin = false
          → Fetch feature flags → Cache
Navigate → Use cached feature flags
```

## Examples

### Feature-Gated Component

```typescript
function PremiumFeature() {
  const { isFeatureEnabled, isAdmin } = useFeature();

  if (!isFeatureEnabled("premium")) {
    return <UpgradePrompt />;
  }

  return (
    <div>
      <PremiumContent />
      {isAdmin && <AdminControls />}
    </div>
  );
}
```

### Admin Dashboard

```typescript
function AdminDashboard() {
  const { isAdmin, isFeatureEnabled } = useFeature();

  // Redirect non-admins
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <UserManagement />
      <FeatureFlagControls />
      <SystemSettings />
    </div>
  );
}
```

### Conditional Feature Display

```typescript
function FeatureList() {
  const { isFeatureEnabled, isAdmin } = useFeature();

  const features = [
    { id: "basic", name: "Basic Features" },
    { id: "advanced", name: "Advanced Features" },
    { id: "premium", name: "Premium Features" },
  ];

  return (
    <ul>
      {features.map((feature) => {
        const enabled = isFeatureEnabled(feature.id);
        return (
          <li key={feature.id}>
            {feature.name}
            {enabled ? " ✅" : " 🔒"}
            {isAdmin && " (Admin Access)"}
          </li>
        );
      })}
    </ul>
  );
}
```

## Troubleshooting

### Admin status not updating?

1. **Check Firebase custom claims**:
   ```typescript
   const token = await auth.currentUser?.getIdTokenResult();
   console.log("Role:", token?.claims.role);
   ```

2. **Force token refresh**:
   ```typescript
   await auth.currentUser?.getIdToken(true);
   window.location.reload();
   ```

3. **Verify role is set correctly**:
   - Role must be exactly `"admin"` or `"super_admin"` (lowercase)
   - Check Firebase console or backend logs

### Features still locked for admin?

1. **Check isAdmin flag**:
   ```typescript
   const { isAdmin } = useFeature();
   console.log("Is Admin:", isAdmin);
   ```

2. **Check context is loaded**:
   ```typescript
   const { loading, isAdmin } = useFeature();
   if (loading) console.log("Still loading...");
   ```

3. **Verify provider is set up**:
   - Ensure `<FeatureFlagsProvider>` wraps your app
   - Check [Providers.tsx:19](clockit_website/src/components/Providers.tsx#L19)

## Related Files

- **Context**: [FeatureFlagsContext.tsx](clockit_website/src/contexts/FeatureFlagsContext.tsx)
- **Hook**: [useFeature.ts](clockit_website/src/hooks/useFeature.ts)
- **RBAC Types**: [rbac/types.ts](clockit_website/src/lib/rbac/types.ts)
- **RBAC Hooks**: [rbac/hooks.ts](clockit_website/src/lib/rbac/hooks.ts)

## Summary

✅ **Admin bypass implemented** - ADMIN and SUPER_ADMIN roles
✅ **Global feature access** - All features enabled for admins
✅ **Automatic detection** - Uses Firebase custom claims
✅ **Zero performance impact** - No additional API calls
✅ **Secure implementation** - Server-side role verification
✅ **Hook integration** - `isAdmin` flag exposed via useFeature
✅ **Backward compatible** - Existing code continues to work

🚀 **Admins now have unrestricted access to all features!**
