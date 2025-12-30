# Feature Flags Implementation Summary

## Overview

Feature flags have been implemented across the Clockit website to control access to features based on user entitlements. The system uses dynamic feature groups stored in Firestore.

## Features Implemented

### Feature Groups Created

Based on the default features in [feature-seed.defaults.ts](clockit_api/src/scripts/feature-seed.defaults.ts):

1. **Clockit Online** (`clockit-online`)
   - `clockit-online`: true
   - `create-goals-for-sessions`: true
   - `create-sessions`: true

2. **Stats Features** (`stats-features`)
   - `base-stats`: true
   - `advanced-stats`: true
   - `clockit-focus-stats`: false
   - `focus-radar`: true
   - `grade-breakdown`: true
   - `detailed-analytics`: true

3. **Session Activity Features** (`session-activity-features`)
   - `session-activity`: true
   - `session-explorer`: true
   - `export-data`: true

4. **IDE Integrations Features** (`ide-integrations-features`)
   - `ide-integration`: true
   - `custom-integrations`: true
   - `api-access`: true

5. **Support Features** (`support-features`)
   - `priority-support`: true
   - `dedicated-support`: false

6. **Team Features** (`team-features`)
   - All currently disabled (false)

## Pages Updated

### 1. Clockit Online (`/clockit-online`)
**File**: [clockit-online/page.tsx](clockit_website/src/app/clockit-online/page.tsx#L16-L26)

**Features Checked**:
- `clockit-online` - Main feature access
- `create-sessions` - Session creation
- `create-goals-for-sessions` - Goals feature

**Behavior**:
- Redirects to `/dashboard` if `clockit-online` feature is disabled
- Shows access denied message with upgrade option
- Conditionally shows Goals tab based on `create-goals-for-sessions` feature

### 2. Advanced Stats (`/advanced-stats`)
**File**: [advanced-stats/page.tsx](clockit_website/src/app/advanced-stats/page.tsx#L43-L63)

**Features Checked**:
- `advanced-stats` OR `base-stats` - Stats access

**Behavior**:
- Redirects to `/dashboard` if no stats access
- Shows upgrade prompt if feature not available
- Uses feature-gated navigation

### 3. Session Activity (`/session-activity`)
**File**: [session-activity/page.tsx](clockit_website/src/app/session-activity/page.tsx#L15-L35)

**Features Checked**:
- `session-activity` OR `session-explorer` - Session tracking access

**Behavior**:
- Redirects to `/dashboard` if no session access
- Shows upgrade prompt for locked features
- Uses feature-gated navigation

### 4. Dashboard (`/dashboard`)
**File**: [dashboard/page.tsx](clockit_website/src/app/dashboard/page.tsx#L62-L79)

**Features Used**:
- Navigation links filtered based on features
- All users can access Dashboard (no restrictions)

## Navigation System

### Navigation Utility
**File**: [utils/navigation.ts](clockit_website/src/utils/navigation.ts)

Created a reusable navigation helper that:
- Builds navigation links based on feature flags
- Automatically marks active page
- Filters out links to features user doesn't have access to

**Functions**:
```typescript
// Check features for navigation
isFeatureEnabledForNav(isFeatureEnabled): FeatureFlags

// Build navigation links array
buildNavLinks(features, activePage?): NavLink[]
```

**Usage Example**:
```typescript
const { isFeatureEnabled } = useFeature(user?.uid);
const featureFlags = isFeatureEnabledForNav(isFeatureEnabled);
const navLinks = buildNavLinks(featureFlags, 'dashboard');

<NavBar links={navLinks} />
```

## Feature Detection Logic

### Primary Features
- `clockit-online` → Access to Clockit Online platform
- `advanced-stats` → Advanced statistics page
- `session-activity` → Session activity tracking

### Fallback Logic
Some features have OR logic for backward compatibility:
- Stats access: `advanced-stats` OR `base-stats`
- Session access: `session-activity` OR `session-explorer`

## User Experience

### Feature Locked States

When a user tries to access a feature they don't have:

1. **Automatic Redirect**: User is redirected to `/dashboard`
2. **Access Denied Page**: Shows friendly message explaining the feature is not available
3. **Upgrade Prompts**: Provides links to:
   - Dashboard (safe fallback)
   - Profile page (to view/upgrade plan)

**Example** ([advanced-stats/page.tsx:187-213](clockit_website/src/app/advanced-stats/page.tsx#L187-L213)):
```typescript
if (!hasStatsAccess) {
  return (
    <div>
      <NavBar links={navLinks} />
      <main>
        <h1>Advanced Stats not available</h1>
        <p>Upgrade to access advanced statistics and analytics.</p>
        <Link href="/dashboard">Go to Dashboard</Link>
        <Link href="/profile">View Plans</Link>
      </main>
    </div>
  );
}
```

### Navigation

Navigation automatically hides links to features the user doesn't have access to. This prevents confusion and provides a clean UX.

## Backend Integration

### API Endpoints

Feature groups are fetched from the API:
- `GET /api/v1/feature-groups/:id` - Get single group
- `POST /api/v1/feature-groups/batch` - Get multiple groups by IDs
- `GET /api/v1/feature-groups` - List all groups

### useFeature Hook

**File**: [hooks/useFeature.ts](clockit_website/src/hooks/useFeature.ts)

The hook automatically:
1. Fetches user's FeatureEntitlement
2. Extracts feature group IDs from entitlement
3. Fetches actual FeatureGroup objects via batch API
4. Provides `isFeatureEnabled()` function that checks against real data

**Return Value**:
```typescript
{
  entitlement: FeatureEntitlement;
  featureGroups: FeatureGroup[];  // Actual groups from API
  loading: boolean;
  error: Error | null;
  isFeatureEnabled: (feature: string) => boolean;
  isGroupEnabled: (group: string) => boolean;
}
```

## Seeding Feature Groups

### Command
```bash
cd clockit_api

# Seed just the default group
npm run seed-feature-groups

# Seed all feature groups (recommended)
npm run seed-feature-groups -- --all
```

### What Gets Seeded
Running `--all` creates 6 feature groups in Firestore:
1. clockit-online
2. stats-features
3. session-activity-features
4. ide-integrations-features
5. support-features
6. team-features

## Testing Feature Flags

### Manual Testing

1. **Seed feature groups**:
   ```bash
   npm run seed-feature-groups -- --all
   ```

2. **Modify user's entitlement** in Firestore:
   ```
   UserFeatureEntitlements/{userId}
   {
     entitlementId: "free",  // or "pro", "enterprise"
     ...
   }
   ```

3. **Test access**:
   - Navigate to different pages
   - Verify correct features are shown/hidden
   - Check navigation links update correctly

### Feature Combinations

**Free Tier** (clockit-online only):
- ✅ Dashboard
- ✅ Clockit Online
- ❌ Advanced Stats
- ❌ Session Activity

**Pro Tier** (clockit-online + stats-features + session-activity-features):
- ✅ Dashboard
- ✅ Clockit Online
- ✅ Advanced Stats
- ✅ Session Activity

## Files Modified

### Frontend
- ✅ [clockit-online/page.tsx](clockit_website/src/app/clockit-online/page.tsx)
- ✅ [advanced-stats/page.tsx](clockit_website/src/app/advanced-stats/page.tsx)
- ✅ [session-activity/page.tsx](clockit_website/src/app/session-activity/page.tsx)
- ✅ [dashboard/page.tsx](clockit_website/src/app/dashboard/page.tsx)
- ✅ [hooks/useFeature.ts](clockit_website/src/hooks/useFeature.ts)
- ✅ [services/featureFlags.ts](clockit_website/src/services/featureFlags.ts)
- ✅ [utils/navigation.ts](clockit_website/src/utils/navigation.ts) - NEW

### Backend
- ✅ [scripts/feature-seed.defaults.ts](clockit_api/src/scripts/feature-seed.defaults.ts)
- ✅ [scripts/seed-feature-groups.ts](clockit_api/src/scripts/seed-feature-groups.ts)

### Documentation
- ✅ [DEFAULT_FEATURE_GROUPS.md](DEFAULT_FEATURE_GROUPS.md)
- ✅ [FEATURE_GROUPS_QUICK_START.md](FEATURE_GROUPS_QUICK_START.md)
- ✅ [FEATURE_FLAGS_IMPLEMENTATION.md](FEATURE_FLAGS_IMPLEMENTATION.md) - THIS FILE

## Best Practices

1. **Always use `useFeature` hook** - Don't check features manually
2. **Check features early** - At the top of component, before rendering
3. **Redirect gracefully** - Use `useEffect` with `router.push()`
4. **Show helpful messages** - Explain why feature is locked and how to upgrade
5. **Use navigation helper** - Don't hardcode navigation links

## Future Enhancements

- [ ] Add feature flag admin UI
- [ ] Implement feature usage analytics
- [ ] Add A/B testing support
- [ ] Create feature preview system for beta testers
- [ ] Add feature expiration dates
- [ ] Implement usage limits per feature
