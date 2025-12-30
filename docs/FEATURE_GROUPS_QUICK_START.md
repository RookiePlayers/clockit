# Feature Groups Quick Start

Quick reference guide for working with Feature Groups in Clockit.

## 🚀 Setup (First Time)

### 1. Seed Feature Groups
```bash
cd clockit_api

# Seed just the default group (clockit-online)
npm run seed-feature-groups

# OR seed all feature groups (recommended)
npm run seed-feature-groups -- --all
```

### 2. Seed Feature Entitlements
```bash
npm run seed-feature-entitlements
```

This creates the default entitlements:
- `free` → has `clockit-online` feature group
- `guest` → has `clockit-online` feature group

## 📦 Available Feature Groups

### 1. `clockit-online` (Default)
```typescript
{
  id: "clockit-online",
  name: "Clockit Online",
  features: {
    "clockit-online": true,
    "create-goals-for-sessions": true
  }
}
```

### 2. `advanced-features`
```typescript
{
  id: "advanced-features",
  name: "Advanced Features",
  features: {
    "advanced-stats": true,
    "session-activity": true,
    "detailed-analytics": true,
    "export-data": true
  }
}
```

### 3. `premium-features`
```typescript
{
  id: "premium-features",
  name: "Premium Features",
  features: {
    "advanced-analytics": true,
    "priority-support": true,
    "team-collaboration": true,
    "custom-integrations": true,
    "api-access": true
  }
}
```

## 💻 Using Features in Code

### Basic Usage
```typescript
import { useFeature } from '@/hooks/useFeature';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

function MyComponent() {
  const [user] = useAuthState(auth);
  const { isFeatureEnabled, loading } = useFeature(user?.uid);

  if (loading) return <div>Loading...</div>;

  const canUseClockitOnline = isFeatureEnabled('clockit-online');
  const canCreateGoals = isFeatureEnabled('create-goals-for-sessions');

  return (
    <div>
      {canUseClockitOnline && <ClockitOnlineFeature />}
      {canCreateGoals && <GoalsManager />}
    </div>
  );
}
```

### Display Feature Groups
```typescript
function FeaturesPage() {
  const [user] = useAuthState(auth);
  const { entitlement, featureGroups, loading } = useFeature(user?.uid);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Your Plan: {entitlement.name}</h2>

      {featureGroups.map(group => (
        <div key={group.id}>
          <h3>{group.name}</h3>
          <p>{group.description}</p>
          <ul>
            {Object.entries(group.features).map(([featureId, enabled]) => (
              enabled && <li key={featureId}>{featureId}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

## 🔧 Managing Feature Groups via API

### Create a Feature Group
```bash
curl -X POST http://localhost:5001/api/v1/feature-groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Beta Features",
    "description": "Features for beta testers",
    "features": {
      "beta-feature-1": true,
      "beta-feature-2": true
    },
    "isActive": true
  }'
```

### Get Feature Groups by IDs (Batch)
```bash
curl -X POST http://localhost:5001/api/v1/feature-groups/batch \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["clockit-online", "advanced-features"]
  }'
```

### List All Feature Groups
```bash
curl http://localhost:5001/api/v1/feature-groups?activeOnly=true
```

### Update a Feature Group
```bash
curl -X PUT http://localhost:5001/api/v1/feature-groups/clockit-online \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "features": {
      "clockit-online": true,
      "create-goals-for-sessions": true,
      "new-feature": true
    }
  }'
```

## 👥 Assigning Features to Users

### Create Entitlement Tiers

```typescript
// Free Tier
{
  id: "free",
  name: "Free",
  featureGroups: ["clockit-online"]
}

// Pro Tier
{
  id: "pro",
  name: "Pro",
  featureGroups: ["clockit-online", "advanced-features"]
}

// Enterprise Tier
{
  id: "enterprise",
  name: "Enterprise",
  featureGroups: ["clockit-online", "advanced-features", "premium-features"]
}
```

### Assign Entitlement to User
Store in `UserFeatureEntitlements/{userId}`:
```typescript
{
  userId: "user123",
  entitlementId: "pro",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}
```

## 🔍 How It Works

```
1. User logs in
   ↓
2. useFeature(userId) hook is called
   ↓
3. Fetches user's FeatureEntitlement from API
   → Returns: { id: "free", name: "Free", featureGroups: ["clockit-online"] }
   ↓
4. Fetches actual FeatureGroup objects via batch API
   → Calls: POST /api/v1/feature-groups/batch { ids: ["clockit-online"] }
   ↓
5. Returns FeatureGroup with actual features
   → Returns: { id: "clockit-online", features: { "clockit-online": true, ... } }
   ↓
6. isFeatureEnabled() checks features in groups
   → Checks: group.features["clockit-online"] === true
   ↓
7. Component renders based on feature flags
```

## ✅ Current Features in Use

Based on codebase analysis:

- ✅ `clockit-online` - Main platform access
- ✅ `create-goals-for-sessions` - Goal creation
- 📝 `advanced-stats` - Referenced in navigation
- 📝 `session-activity` - Referenced in navigation
- 📝 `advanced-analytics` - Used in examples

## 📚 Related Documentation

- [Complete Feature Groups Guide](FEATURE_GROUPS_GUIDE.md)
- [Default Feature Groups](DEFAULT_FEATURE_GROUPS.md)
- [useFeature Hook Update](USE_FEATURE_HOOK_UPDATE.md)

## 🐛 Troubleshooting

### Feature not working?
1. Check if feature exists in FeatureGroup: `group.features["feature-id"] === true`
2. Verify FeatureGroup ID is in user's entitlement: `entitlement.featureGroups.includes("group-id")`
3. Ensure FeatureGroup is active: `group.isActive === true`

### Feature groups not loading?
1. Check browser console for API errors
2. Verify backend is running: `http://localhost:5001/api/v1/feature-groups`
3. Check if feature groups are seeded in Firestore

### User has wrong features?
1. Check `UserFeatureEntitlements/{userId}` in Firestore
2. Verify the `entitlementId` matches a valid FeatureEntitlement
3. Check that FeatureEntitlement has correct `featureGroups` array
