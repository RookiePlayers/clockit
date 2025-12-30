# Default Feature Groups

This document describes the default feature groups available in Clockit and how to seed them.

## Overview

Feature groups are collections of related features that can be assigned to users through Feature Entitlements. The system provides three default feature groups that cover different tiers of functionality.

## Default Feature Groups

### 1. Clockit Online (Base Tier)
**ID**: `clockit-online`

**Description**: Base access to Clockit Online features including session tracking and goal management.

**Features**:
- `clockit-online` - Access to the Clockit Online platform
- `create-goals-for-sessions` - Create and manage goals for tracking sessions
- `view-sessions` (future) - View session history
- `track-time` (future) - Basic time tracking

**Target Users**: Free tier users, guest users

---

### 2. Advanced Features (Mid Tier)
**ID**: `advanced-features`

**Description**: Advanced analytics, statistics, and session activity tracking.

**Features**:
- `advanced-stats` - Access to advanced statistics dashboard
- `session-activity` - Detailed session activity tracking and history
- `detailed-analytics` - In-depth analytics and insights
- `export-data` - Export session data in various formats

**Target Users**: Premium users who need deeper insights

---

### 3. Premium Features (Top Tier)
**ID**: `premium-features`

**Description**: Premium features including advanced analytics, priority support, and team collaboration.

**Features**:
- `advanced-analytics` - Enterprise-level analytics
- `priority-support` - Priority customer support
- `team-collaboration` - Team features and collaboration tools
- `custom-integrations` - Custom integrations with third-party tools
- `api-access` - API access for programmatic integration

**Target Users**: Enterprise users, teams, power users

---

## Feature Usage in Codebase

Based on analysis of the codebase, here are the features currently in use:

### Active Features
- ✅ `clockit-online` - Used in [clockit-online/page.tsx:20](clockit_website/src/app/clockit-online/page.tsx#L20)
- ✅ `create-goals-for-sessions` - Used in [clockit-online/page.tsx:19](clockit_website/src/app/clockit-online/page.tsx#L19)
- ✅ `advanced-analytics` - Referenced in examples

### Pages/Routes Available
- `/clockit-online` - Main online platform
- `/advanced-stats` - Advanced statistics page
- `/session-activity` - Session activity tracking
- `/dashboard` - Main dashboard
- `/profile` - User profile

## Seeding Feature Groups

### Seed Default Feature Group Only
```bash
cd clockit_api
npm run seed-feature-groups
```

This will seed only the `clockit-online` feature group (base tier).

### Seed All Feature Groups
```bash
cd clockit_api
npm run seed-feature-groups -- --all
```

This will seed all three feature groups:
1. Clockit Online
2. Advanced Features
3. Premium Features

### Output Example
```
🌱 Seeding all feature groups...

✅ Seeded feature group: Clockit Online (clockit-online)
   Features: clockit-online, create-goals-for-sessions

✅ Seeded feature group: Advanced Features (advanced-features)
   Features: advanced-stats, session-activity, detailed-analytics, export-data

✅ Seeded feature group: Premium Features (premium-features)
   Features: advanced-analytics, priority-support, team-collaboration, custom-integrations, api-access

📋 Summary:
   Total feature groups: 3
   Total unique features: 11

✨ Done!
```

## Assigning Feature Groups to Users

Feature groups are assigned through Feature Entitlements. Update the entitlement's `featureGroups` array:

```typescript
// Free tier - base features only
{
  id: "free",
  name: "Free",
  featureGroups: ["clockit-online"]
}

// Pro tier - base + advanced
{
  id: "pro",
  name: "Pro",
  featureGroups: ["clockit-online", "advanced-features"]
}

// Enterprise tier - all features
{
  id: "enterprise",
  name: "Enterprise",
  featureGroups: ["clockit-online", "advanced-features", "premium-features"]
}
```

## Checking Features in Code

```typescript
import { useFeature } from '@/hooks/useFeature';

function MyComponent() {
  const [user] = useAuthState(auth);
  const { isFeatureEnabled, featureGroups, loading } = useFeature(user?.uid);

  if (loading) return <div>Loading...</div>;

  // Check individual features
  const canUseClockitOnline = isFeatureEnabled('clockit-online');
  const canCreateGoals = isFeatureEnabled('create-goals-for-sessions');
  const canUseAdvancedStats = isFeatureEnabled('advanced-stats');
  const hasPrioritySupport = isFeatureEnabled('priority-support');

  return (
    <div>
      {canUseClockitOnline && <ClockitOnlineFeature />}
      {canCreateGoals && <GoalsManager />}
      {canUseAdvancedStats && <AdvancedStats />}
      {hasPrioritySupport && <PrioritySupportBadge />}
    </div>
  );
}
```

## Adding New Features

To add a new feature:

1. **Update the feature group** in Firestore or via API:
   ```typescript
   await featureGroupsApi.update('clockit-online', {
     features: {
       'clockit-online': true,
       'create-goals-for-sessions': true,
       'new-feature': true,  // Add new feature
     }
   });
   ```

2. **Use the feature in code**:
   ```typescript
   const canUseNewFeature = isFeatureEnabled('new-feature');
   ```

3. **No code deployment needed** - features are stored in Firestore and fetched at runtime

## Best Practices

1. **Naming Convention**: Use kebab-case for feature IDs (e.g., `advanced-analytics`)
2. **Descriptive Names**: Make feature names self-documenting
3. **Group Related Features**: Bundle features that naturally belong together
4. **Start Small**: Begin with essential features, add more as needed
5. **Document Features**: Update this file when adding new feature groups
6. **Test Changes**: Always test feature toggles before deploying to production

## Related Files

- Seed Script: [seed-feature-groups.ts](clockit_api/src/scripts/seed-feature-groups.ts)
- Feature Defaults: [feature-seed.defaults.ts](clockit_api/src/scripts/feature-seed.defaults.ts)
- Feature Groups API: [feature-group.controller.ts](clockit_api/src/controllers/feature-group.controller.ts)
- useFeature Hook: [useFeature.ts](clockit_website/src/hooks/useFeature.ts)
- Complete Guide: [FEATURE_GROUPS_GUIDE.md](FEATURE_GROUPS_GUIDE.md)
