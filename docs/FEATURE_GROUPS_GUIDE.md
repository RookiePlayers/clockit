# Feature Groups System Guide

## Overview

Feature Groups are collections of related features that can be assigned to users through Feature Entitlements. This system provides a flexible way to manage feature access and create different product tiers.

## Architecture

```
User → FeatureEntitlement → FeatureGroup IDs → FeatureGroups (Firestore) → Features
```

1. **User** has a **FeatureEntitlement** (stored in Firestore)
2. **FeatureEntitlement** contains an array of **FeatureGroup IDs** (`featureGroups: string[]`)
3. **FeatureGroup IDs** are used to fetch actual **FeatureGroup** documents from Firestore
4. **FeatureGroups** contain the list of **features** (feature IDs/names)

## Data Structure

### FeatureGroup (Firestore Collection: `FeatureGroups`)

```typescript
interface FeatureGroup {
  id: string;              // Unique identifier
  name: string;            // Display name (e.g., "Clockit Online")
  description?: string;    // Optional description
  features: string[];      // Array of feature IDs
  isActive: boolean;       // Whether this group is active
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

### FeatureEntitlement (Firestore Collection: `FeatureEntitlements`)

```typescript
interface FeatureEntitlement {
  id: string;              // Entitlement ID (e.g., "free", "pro")
  name: string;            // Display name (e.g., "Free Plan", "Pro Plan")
  featureGroups: string[]; // Array of FeatureGroup IDs
}
```

## API Endpoints

### Feature Groups API (`/api/v1/feature-groups`)

#### Create Feature Group
```bash
POST /api/v1/feature-groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Clockit Online",
  "description": "Online session tracking features",
  "features": ["clockit-online", "create-goals-for-sessions"],
  "isActive": true
}

Response: { featureGroup: FeatureGroup }
```

#### Get Feature Group by ID
```bash
GET /api/v1/feature-groups/:id

Response: { featureGroup: FeatureGroup }
```

#### Get Multiple Feature Groups by IDs (Batch)
```bash
POST /api/v1/feature-groups/batch
Content-Type: application/json

{
  "ids": ["group-id-1", "group-id-2"]
}

Response: { featureGroups: FeatureGroup[] }
```

#### List All Feature Groups
```bash
GET /api/v1/feature-groups?activeOnly=true

Response: { featureGroups: FeatureGroup[] }
```

#### Update Feature Group
```bash
PUT /api/v1/feature-groups/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "features": ["feature-1", "feature-2"],
  "isActive": false
}

Response: { featureGroup: FeatureGroup }
```

#### Delete Feature Group
```bash
DELETE /api/v1/feature-groups/:id
Authorization: Bearer <token>

Response: { message: "Feature group deleted successfully" }
```

## Frontend Usage

### 1. Using the `useFeature` Hook (Recommended)

The `useFeature` hook is the simplest way to work with features. It automatically:

- Fetches the user's FeatureEntitlement
- Fetches the actual FeatureGroup objects from the API
- Provides `isFeatureEnabled()` that checks against real FeatureGroups

```typescript
import { useFeature } from '@/hooks/useFeature';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

function MyComponent() {
  const [user] = useAuthState(auth);

  // Everything is automatic!
  const {
    entitlement,      // User's FeatureEntitlement
    featureGroups,    // Actual FeatureGroup objects from API
    loading,
    error,
    isFeatureEnabled, // Check if a feature is enabled
    isGroupEnabled,   // Check if a group is enabled
  } = useFeature(user?.uid);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const canUseClockitOnline = isFeatureEnabled('clockit-online');

  return (
    <div>
      <p>Plan: {entitlement.name}</p>

      {canUseClockitOnline && (
        <ClockitOnlineFeature />
      )}

      {/* Display feature groups */}
      {featureGroups.map(group => (
        <div key={group.id}>
          <h3>{group.name}</h3>
          <p>Features: {group.features.join(', ')}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. Using `useFeatureGroups` Hook Directly

For more granular control, use `useFeatureGroups` directly:

```typescript
import { useFeatureGroups } from '@/hooks/useFeatureGroups';
import { getUserFeatureEntitlement } from '@/services/featureFlags';

function MyComponent() {
  const [user] = useAuthState(auth);
  const [entitlement, setEntitlement] = useState(null);

  // Get user's entitlement
  useEffect(() => {
    async function fetchEntitlement() {
      const ent = await getUserFeatureEntitlement(user?.uid);
      setEntitlement(ent);
    }
    fetchEntitlement();
  }, [user?.uid]);

  // Fetch actual feature groups from IDs
  const { featureGroups, loading, error } = useFeatureGroups(
    entitlement?.featureGroups
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {featureGroups.map(group => (
        <div key={group.id}>
          <h3>{group.name}</h3>
          <p>Features: {group.features.join(', ')}</p>
        </div>
      ))}
    </div>
  );
}
```

### 3. Checking if a Feature is Enabled

```typescript
import { isFeatureEnabledInGroups } from '@/services/featureFlags';

function MyComponent() {
  const { featureGroups } = useFeatureGroups(entitlement?.featureGroups);

  const canUseClockitOnline = isFeatureEnabledInGroups(
    featureGroups,
    'clockit-online'
  );

  return (
    <div>
      {canUseClockitOnline && (
        <ClockitOnlineFeature />
      )}
    </div>
  );
}
```

### 3. Fetching All Feature Groups (Admin UI)

```typescript
import { useAllFeatureGroups } from '@/hooks/useFeatureGroups';

function AdminFeatureGroupManager() {
  const { featureGroups, loading } = useAllFeatureGroups(true); // activeOnly

  return (
    <div>
      <h2>All Feature Groups</h2>
      {featureGroups.map(group => (
        <div key={group.id}>
          {group.name} - {group.features.length} features
        </div>
      ))}
    </div>
  );
}
```

### 4. Using the API Client Directly

```typescript
import { featureGroupsApi } from '@/lib/api-client';

// Create a feature group
const newGroup = await featureGroupsApi.create({
  name: "Premium Features",
  description: "Advanced features for premium users",
  features: ["advanced-analytics", "priority-support"],
  isActive: true
});

// Get specific groups
const groups = await featureGroupsApi.getByIds(['group-1', 'group-2']);

// Update a group
await featureGroupsApi.update('group-id', {
  features: ['feature-1', 'feature-2', 'feature-3']
});

// Delete a group
await featureGroupsApi.delete('group-id');
```

## Backend Usage

### Creating Feature Groups

```typescript
import { FeatureGroupService } from '@/services/feature-group.service';

const featureGroup = await FeatureGroupService.createFeatureGroup(userId, {
  name: "Clockit Online",
  description: "Online session tracking",
  features: ["clockit-online", "create-goals-for-sessions"],
  isActive: true
});
```

### Fetching Feature Groups

```typescript
// Get by ID
const group = await FeatureGroupService.getFeatureGroup('group-id');

// Get multiple by IDs
const groups = await FeatureGroupService.getFeatureGroupsByIds([
  'group-1',
  'group-2'
]);

// List all (with optional filter)
const allGroups = await FeatureGroupService.listFeatureGroups(true); // activeOnly
```

### Updating Feature Groups

```typescript
const updated = await FeatureGroupService.updateFeatureGroup('group-id', {
  features: ['feature-1', 'feature-2'],
  isActive: false
});
```

## Migration from Legacy System

The old system used a hardcoded `FEATURE_GROUPS` constant:

```typescript
// OLD (deprecated)
export const FEATURE_GROUPS: Record<string, { group: string; features: string[] }> = {
  "clockit-online": {
    group: "clockit-online",
    features: ["clockit-online", "create-goals-for-sessions"],
  },
};
```

**New approach:**

1. Create FeatureGroup documents in Firestore
2. Reference them by ID in FeatureEntitlements
3. Fetch actual data from API when needed

### Migration Steps

1. **Create Feature Groups in Firestore:**
   ```typescript
   await featureGroupsApi.create({
     name: "Clockit Online",
     features: ["clockit-online", "create-goals-for-sessions"],
     isActive: true
   });
   ```

2. **Update FeatureEntitlements** to reference the new group IDs instead of hardcoded strings.

3. **Replace legacy code:**
   ```typescript
   // OLD
   const enabled = isFeatureEnabled(entitlement, 'clockit-online');

   // NEW
   const groups = await getFeatureGroupsByIds(entitlement.featureGroups);
   const enabled = isFeatureEnabledInGroups(groups, 'clockit-online');
   ```

## Example Use Cases

### 1. Free vs Pro Plan

**Free Plan Feature Group:**
```json
{
  "id": "free-features",
  "name": "Free Features",
  "features": ["basic-tracking", "export-csv"],
  "isActive": true
}
```

**Pro Plan Feature Group:**
```json
{
  "id": "pro-features",
  "name": "Pro Features",
  "features": ["advanced-analytics", "team-collaboration", "priority-support"],
  "isActive": true
}
```

**Free Entitlement:**
```json
{
  "id": "free",
  "name": "Free Plan",
  "featureGroups": ["free-features"]
}
```

**Pro Entitlement:**
```json
{
  "id": "pro",
  "name": "Pro Plan",
  "featureGroups": ["free-features", "pro-features"]
}
```

### 2. Beta Features

```json
{
  "id": "beta-features",
  "name": "Beta Features",
  "description": "Experimental features for beta testers",
  "features": ["ai-insights", "custom-dashboards"],
  "isActive": true
}
```

Assign to specific users by adding "beta-features" to their entitlement's `featureGroups` array.

### 3. Team-Specific Features

```json
{
  "id": "team-alpha-features",
  "name": "Team Alpha Features",
  "features": ["custom-integration-alpha", "alpha-api-access"],
  "isActive": true
}
```

## Best Practices

1. **Use Descriptive Names:** Make feature group names clear and self-documenting
2. **Group Related Features:** Bundle features that naturally belong together
3. **Version Feature IDs:** Use versioned feature IDs (e.g., "analytics-v2") for easier tracking
4. **Keep Groups Focused:** Don't create overly large feature groups
5. **Use isActive Flag:** Temporarily disable groups without deleting them
6. **Document Features:** Add descriptions to explain what each group provides
7. **Batch Fetch:** Use the batch endpoint when fetching multiple groups to reduce API calls

## Security Considerations

- ✅ **Create/Update/Delete** endpoints require authentication
- ✅ **Read** endpoints are public (feature groups are not sensitive data)
- ⚠️ **Admin-only operations:** Consider adding RBAC checks for create/update/delete
- 🔒 **Feature enforcement:** Always verify features on the backend, never trust frontend checks alone

## Troubleshooting

### Feature not showing up
1. Check if the feature ID exists in the FeatureGroup's `features` array
2. Verify the FeatureGroup ID is in the user's entitlement `featureGroups` array
3. Ensure the FeatureGroup has `isActive: true`

### Stale feature groups
- Feature groups are fetched on component mount
- To refresh, unmount/remount the component or add a refresh mechanism

### Performance issues
- Use the batch endpoint (`/feature-groups/batch`) instead of individual requests
- Cache feature groups in React state/context
- Consider using React Query or SWR for automatic caching

## Related Files

**Backend:**
- Types: `/clockit_api/src/types/feature-group.types.ts`
- Service: `/clockit_api/src/services/feature-group.service.ts`
- Controller: `/clockit_api/src/controllers/feature-group.controller.ts`
- Routes: `/clockit_api/src/routes/feature-group.routes.ts`

**Frontend:**
- Types: `/clockit_website/src/types/feature-group.types.ts`
- Hooks:
  - `/clockit_website/src/hooks/useFeature.ts` (recommended - all-in-one)
  - `/clockit_website/src/hooks/useFeatureGroups.ts` (granular control)
- API Client: `/clockit_website/src/lib/api-client.ts` (featureGroupsApi)
- Service: `/clockit_website/src/services/featureFlags.ts`
- Examples:
  - `/clockit_website/src/components/UseFeatureExample.tsx` (useFeature hook)
  - `/clockit_website/src/components/FeatureGroupsExample.tsx` (useFeatureGroups hook)
