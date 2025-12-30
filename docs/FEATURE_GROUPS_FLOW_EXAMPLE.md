# Feature Groups - Complete Flow Example

## Step-by-Step: From Setup to Usage

### Step 1: Create Feature Groups (One-Time Setup)

```typescript
// Admin creates feature groups via API or Firestore Console
// This happens once during setup

// Create "Free Features" group
const freeGroup = await featureGroupsApi.create({
  name: "Free Features",
  description: "Basic features for free users",
  features: ["basic-tracking", "export-csv"],
  isActive: true
});
// Returns: { featureGroup: { id: "fg_free_xyz", ... } }

// Create "Pro Features" group
const proGroup = await featureGroupsApi.create({
  name: "Pro Features",
  description: "Advanced features for pro users",
  features: ["advanced-analytics", "team-collaboration", "priority-support"],
  isActive: true
});
// Returns: { featureGroup: { id: "fg_pro_abc", ... } }

// Create "Clockit Online" group
const clockitGroup = await featureGroupsApi.create({
  name: "Clockit Online",
  description: "Online session tracking",
  features: ["clockit-online", "create-goals-for-sessions"],
  isActive: true
});
// Returns: { featureGroup: { id: "fg_clockit_123", ... } }
```

**Result in Firestore:**
```
FeatureGroups/
  ├─ fg_free_xyz
  │  {
  │    id: "fg_free_xyz",
  │    name: "Free Features",
  │    features: ["basic-tracking", "export-csv"],
  │    isActive: true
  │  }
  │
  ├─ fg_pro_abc
  │  {
  │    id: "fg_pro_abc",
  │    name: "Pro Features",
  │    features: ["advanced-analytics", "team-collaboration", ...],
  │    isActive: true
  │  }
  │
  └─ fg_clockit_123
     {
       id: "fg_clockit_123",
       name: "Clockit Online",
       features: ["clockit-online", "create-goals-for-sessions"],
       isActive: true
     }
```

### Step 2: Create Feature Entitlements (Plans)

```typescript
// Admin creates entitlements that reference the feature groups

// Free Plan - only gets free features + clockit online
FeatureEntitlements/free
{
  id: "free",
  name: "Free Plan",
  featureGroups: [
    "fg_free_xyz",      // Free features
    "fg_clockit_123"    // Clockit Online
  ]
}

// Pro Plan - gets everything
FeatureEntitlements/pro
{
  id: "pro",
  name: "Pro Plan",
  featureGroups: [
    "fg_free_xyz",      // Free features
    "fg_pro_abc",       // Pro features
    "fg_clockit_123"    // Clockit Online
  ]
}
```

### Step 3: Assign Entitlement to User

```typescript
// When user signs up or upgrades, assign entitlement
// This is stored in a UserFeatureEntitlements collection

UserFeatureEntitlements/user123
{
  userId: "user123",
  entitlementId: "free",  // References the "free" entitlement
  createdAt: "2025-01-01T00:00:00Z"
}

// Or for a pro user:
UserFeatureEntitlements/user456
{
  userId: "user456",
  entitlementId: "pro",  // References the "pro" entitlement
  createdAt: "2025-01-01T00:00:00Z"
}
```

### Step 4: Frontend Automatically Fetches Everything

```typescript
// In your React component
import { useFeature } from '@/hooks/useFeature';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

function MyApp() {
  const [user] = useAuthState(auth);

  // This ONE hook does all the work:
  const {
    entitlement,     // The user's plan
    featureGroups,   // All their feature groups
    isFeatureEnabled,
    loading
  } = useFeature(user?.uid);

  if (loading) return <div>Loading...</div>;

  // Check individual features
  const hasBasicTracking = isFeatureEnabled('basic-tracking');
  const hasAdvancedAnalytics = isFeatureEnabled('advanced-analytics');
  const hasClockitOnline = isFeatureEnabled('clockit-online');

  return (
    <div>
      <h1>Welcome to {entitlement.name}!</h1>

      {/* Show what groups they have */}
      <div>
        <h2>Your Feature Groups:</h2>
        {featureGroups.map(group => (
          <div key={group.id}>
            <h3>{group.name}</h3>
            <p>{group.description}</p>
            <ul>
              {group.features.map(feature => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Conditionally render based on features */}
      {hasBasicTracking && <BasicTrackingDashboard />}
      {hasAdvancedAnalytics && <AdvancedAnalyticsDashboard />}
      {hasClockitOnline && <ClockitOnlineFeature />}
    </div>
  );
}
```

### What Happens Behind the Scenes

#### For Free User (user123):

1. **Hook receives:** `userId = "user123"`

2. **Fetches UserFeatureEntitlement:**
   ```
   GET /api/v1/features/user-entitlement

   Response:
   {
     entitlementId: "free",
     entitlement: {
       id: "free",
       name: "Free Plan",
       featureGroups: ["fg_free_xyz", "fg_clockit_123"]
     }
   }
   ```

3. **Extracts group IDs:** `["fg_free_xyz", "fg_clockit_123"]`

4. **Fetches actual FeatureGroups:**
   ```
   POST /api/v1/feature-groups/batch
   Body: { ids: ["fg_free_xyz", "fg_clockit_123"] }

   Response:
   {
     featureGroups: [
       {
         id: "fg_free_xyz",
         name: "Free Features",
         features: ["basic-tracking", "export-csv"]
       },
       {
         id: "fg_clockit_123",
         name: "Clockit Online",
         features: ["clockit-online", "create-goals-for-sessions"]
       }
     ]
   }
   ```

5. **Hook returns:**
   ```typescript
   {
     entitlement: {
       id: "free",
       name: "Free Plan",
       featureGroups: ["fg_free_xyz", "fg_clockit_123"]
     },
     featureGroups: [
       { id: "fg_free_xyz", features: ["basic-tracking", "export-csv"] },
       { id: "fg_clockit_123", features: ["clockit-online", ...] }
     ],
     isFeatureEnabled: (featureId) => {
       // Checks if ANY group contains this feature
       return featureGroups.some(g => g.features.includes(featureId))
     }
   }
   ```

6. **Feature checks:**
   ```typescript
   isFeatureEnabled('basic-tracking')      // ✅ true (in fg_free_xyz)
   isFeatureEnabled('clockit-online')      // ✅ true (in fg_clockit_123)
   isFeatureEnabled('advanced-analytics')  // ❌ false (not in any group)
   ```

#### For Pro User (user456):

Same process, but they have 3 groups:
```typescript
featureGroups: [
  { id: "fg_free_xyz", features: ["basic-tracking", "export-csv"] },
  { id: "fg_pro_abc", features: ["advanced-analytics", ...] },
  { id: "fg_clockit_123", features: ["clockit-online", ...] }
]

// So they can access ALL features:
isFeatureEnabled('basic-tracking')      // ✅ true
isFeatureEnabled('advanced-analytics')  // ✅ true
isFeatureEnabled('clockit-online')      // ✅ true
```

### Updating Features (No Code Deploy!)

**Scenario:** You want to add a new feature to the Free plan

```typescript
// Just update the FeatureGroup in Firestore:
await featureGroupsApi.update('fg_free_xyz', {
  features: [
    "basic-tracking",
    "export-csv",
    "new-feature-yay"  // ← Add this
  ]
});
```

**Result:** ALL free users immediately get access to `new-feature-yay` when they reload!

### Upgrading a User

```typescript
// User upgrades from free to pro
// Just update their entitlement reference:

UserFeatureEntitlements/user123
{
  userId: "user123",
  entitlementId: "pro",  // Changed from "free" to "pro"
  updatedAt: "2025-01-02T00:00:00Z"
}

// Next time they load the app:
// - Hook fetches "pro" entitlement
// - Gets 3 feature groups instead of 2
// - User now has access to pro features!
```

### Summary

**Data Structure:**
```
User
  ↓ (has)
UserFeatureEntitlement (stores entitlementId: "free")
  ↓ (references)
FeatureEntitlement (stores featureGroups: ["fg_free_xyz", "fg_clockit_123"])
  ↓ (contains IDs that reference)
FeatureGroups (stores actual features: ["basic-tracking", "export-csv"])
```

**Runtime Flow:**
```
1. useFeature(userId)
2. Fetch UserFeatureEntitlement → get entitlementId
3. Fetch FeatureEntitlement → get featureGroups array of IDs
4. Fetch FeatureGroups by IDs → get actual feature lists
5. Return everything to component
6. Component checks features → isFeatureEnabled('feature-name')
```

**Benefits:**
- ✅ **No hardcoding** - All features in database
- ✅ **Easy updates** - Change features without code deploy
- ✅ **Flexible plans** - Mix and match feature groups
- ✅ **Scalable** - Add unlimited features and groups
- ✅ **Automatic** - useFeature hook handles everything
