# Feature Flags Caching System

## Overview

The feature flags system now includes **React Context + Session Storage caching** to improve performance and reduce unnecessary API calls.

## How It Works

### Architecture

```
User Login
    ↓
FeatureFlagsProvider (Context)
    ↓
1. Check Session Storage Cache
    ├─ Cache Hit (< 5 min old) → Use Cached Data ✅
    └─ Cache Miss/Expired → Fetch from API
           ↓
       Save to Session Storage
           ↓
       Distribute via Context
           ↓
    All useFeature() hooks get cached data
```

### Components

1. **FeatureFlagsContext** - React Context for global state
2. **FeatureFlagsProvider** - Provider component with caching logic
3. **useFeature** - Hook to access feature flags (uses context)
4. **Session Storage** - Browser storage for cache persistence

## Configuration

### Cache Settings

**File**: [FeatureFlagsContext.tsx](clockit_website/src/contexts/FeatureFlagsContext.tsx#L8-L9)

```typescript
const CACHE_KEY_PREFIX = "clockit_features_";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

**Customize TTL**:
```typescript
// Change to 10 minutes
const CACHE_TTL_MS = 10 * 60 * 1000;

// Change to 1 minute (good for development)
const CACHE_TTL_MS = 1 * 60 * 1000;
```

## Setup

### 1. Provider Integration

The `FeatureFlagsProvider` is already integrated in [Providers.tsx](clockit_website/src/components/Providers.tsx#L19):

```typescript
export default function Providers({ children }) {
  const [user] = useAuthState(auth);

  return (
    <ThemeProvider>
      <SnackbarProvider>
        <FeatureFlagsProvider userId={user?.uid}>
          {children}
        </FeatureFlagsProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
```

### 2. Using the Hook

**Before** (No caching):
```typescript
const [user] = useAuthState(auth);
const { isFeatureEnabled } = useFeature(user?.uid);
```

**After** (With caching):
```typescript
const { isFeatureEnabled } = useFeature();
// No need to pass userId - context handles it!
```

## Cache Behavior

### Cache Hit (Fast Path)

```typescript
// First page load
useFeature() → API Call → Cache saved
// Time: ~200ms

// Navigate to another page (within 5 min)
useFeature() → Cache hit! → Instant
// Time: < 1ms ⚡
```

### Cache Miss (API Call)

Cache is invalidated when:
- ✅ **Age > 5 minutes** - Cache expired
- ✅ **User logs out** - All caches cleared
- ✅ **User ID changes** - Different user logged in
- ✅ **Manual clear** - `clearCache()` called

## API Reference

### useFeature Hook

```typescript
const {
  entitlement,      // User's feature entitlement
  featureGroups,    // Actual feature groups from API
  loading,          // Loading state (only true on cache miss)
  error,            // Error if API call fails
  isFeatureEnabled, // Check if feature is enabled
  isGroupEnabled,   // Check if group is enabled
  clearCache,       // Manually clear cache for current user
  refetch,          // Force refetch (bypass cache)
} = useFeature();
```

### Manual Cache Control

```typescript
import { useFeature } from "@/hooks/useFeature";

function MyComponent() {
  const { clearCache, refetch } = useFeature();

  const handleUpgrade = async () => {
    // User upgraded their plan
    await upgradeUserPlan();

    // Clear cache and refetch to get new features
    await refetch();
  };

  const handleCacheClear = () => {
    // Manually clear cache
    clearCache?.();
  };

  return (
    <button onClick={handleUpgrade}>Upgrade Plan</button>
  );
}
```

### Utility Functions

```typescript
import {
  clearAllFeatureFlagCaches,
  clearFeatureFlagCache,
  getFeatureFlagCacheStats,
} from "@/utils/featureFlagCache";

// Clear all feature flag caches
clearAllFeatureFlagCaches();

// Clear cache for specific user
clearFeatureFlagCache("user-123");

// Get cache statistics (debugging)
const stats = getFeatureFlagCacheStats();
console.log(stats);
// {
//   totalCaches: 2,
//   cacheKeys: ["clockit_features_user-123", "clockit_features_user-456"],
//   totalSize: 1024
// }
```

## Cache Invalidation

### Automatic Invalidation

1. **On Logout**
   ```typescript
   // User logs out
   auth.signOut();
   // → userId becomes null
   // → FeatureFlagsProvider detects change
   // → All caches cleared automatically ✅
   ```

2. **On User Change**
   ```typescript
   // Different user logs in
   // → userId changes from "user-123" to "user-456"
   // → Old cache ignored
   // → New cache created for new user ✅
   ```

3. **On Cache Expiration**
   ```typescript
   // Cache older than 5 minutes
   // → isExpired = true
   // → API call triggered
   // → Fresh data cached ✅
   ```

### Manual Invalidation

```typescript
const { refetch, clearCache } = useFeature();

// Method 1: Clear cache and refetch
await refetch();

// Method 2: Clear cache only (will refetch on next mount)
clearCache?.();

// Method 3: Clear all caches (utility function)
import { clearAllFeatureFlagCaches } from "@/utils/featureFlagCache";
clearAllFeatureFlagCaches();
```

## Performance Comparison

### Without Caching (Before)

```
Page Load → useFeature() → API Call (200ms)
Navigate → useFeature() → API Call (200ms)
Navigate → useFeature() → API Call (200ms)

Total: 3 API calls, 600ms loading time
```

### With Caching (After)

```
Page Load → useFeature() → API Call (200ms) → Cache saved
Navigate → useFeature() → Cache hit! (< 1ms)
Navigate → useFeature() → Cache hit! (< 1ms)

Total: 1 API call, 202ms loading time
Savings: 2 API calls, 398ms ⚡
```

## Cache Storage Details

### Session Storage Structure

```typescript
// Key format
"clockit_features_{userId}"

// Example key
"clockit_features_abc123"

// Cached data structure
{
  entitlement: {
    id: "free",
    name: "Free",
    featureGroups: ["clockit-online"]
  },
  featureGroups: [
    {
      id: "clockit-online",
      name: "Clockit Online",
      features: {
        "clockit-online": true,
        "create-sessions": true
      }
    }
  ],
  timestamp: 1704067200000,
  userId: "abc123"
}
```

### Storage Limits

- **Session Storage**: ~5-10 MB per domain
- **Feature Flag Cache**: Typically < 5 KB per user
- **Estimate**: Can cache ~1000+ users before hitting limits

### Cache Cleanup

Caches are automatically cleaned up:
- ✅ On browser close (session storage cleared)
- ✅ On logout (programmatic clear)
- ✅ On cache expiration (stale data removed)

## Debugging

### Check Cache Status

```typescript
import { getFeatureFlagCacheStats } from "@/utils/featureFlagCache";

// In browser console
const stats = getFeatureFlagCacheStats();
console.log("Total caches:", stats.totalCaches);
console.log("Cache keys:", stats.cacheKeys);
console.log("Total size:", stats.totalSize, "bytes");
```

### View Cache Data

```typescript
// In browser console
const cacheKey = "clockit_features_user-123";
const cached = sessionStorage.getItem(cacheKey);
console.log(JSON.parse(cached));
```

### Clear Cache (Development)

```typescript
// In browser console
sessionStorage.clear(); // Clears ALL session storage
// OR
import { clearAllFeatureFlagCaches } from "@/utils/featureFlagCache";
clearAllFeatureFlagCaches(); // Clears only feature flag caches
```

### Force API Call

```typescript
const { refetch } = useFeature();

// Force API call (bypass cache)
await refetch();
```

## Best Practices

### ✅ DO

- Let the context handle caching automatically
- Use `refetch()` after user upgrades/downgrades
- Keep TTL between 1-10 minutes for good UX
- Use cache stats for monitoring

### ❌ DON'T

- Don't bypass the provider (always use context)
- Don't store sensitive data in cache (it's session storage)
- Don't set TTL too high (stale data)
- Don't set TTL too low (defeats caching purpose)

## Migration Guide

### Migrating Existing Code

**Old Code**:
```typescript
const [user] = useAuthState(auth);
const { isFeatureEnabled, loading } = useFeature(user?.uid);
```

**New Code**:
```typescript
// userId is automatically handled by context
const { isFeatureEnabled, loading } = useFeature();
```

**That's it!** The provider is already set up in the app layout.

## Troubleshooting

### Cache not working?

1. **Check provider is set up**:
   ```typescript
   // In Providers.tsx
   <FeatureFlagsProvider userId={user?.uid}>
     {children}
   </FeatureFlagsProvider>
   ```

2. **Check userId is being passed**:
   ```typescript
   const [user] = useAuthState(auth);
   console.log("User ID:", user?.uid);
   ```

3. **Check cache in storage**:
   ```typescript
   console.log(sessionStorage);
   // Look for keys starting with "clockit_features_"
   ```

### Stale data after upgrade?

```typescript
const { refetch } = useFeature();

// After user upgrades
await refetch(); // Force fresh data
```

### Cache not clearing on logout?

```typescript
// The provider automatically clears on logout
// If not working, manually clear:
import { clearAllFeatureFlagCaches } from "@/utils/featureFlagCache";

const handleLogout = async () => {
  clearAllFeatureFlagCaches();
  await auth.signOut();
};
```

## Security Considerations

- ✅ Session storage is **per-tab** and **per-origin**
- ✅ Data cleared on browser close
- ✅ No cross-origin access
- ⚠️ Data is **not encrypted** (don't cache sensitive info)
- ⚠️ Client-side cache (always verify features on backend)

## Testing

### Test Cache Hit

```typescript
import { render } from '@testing-library/react';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';

test('uses cached data on second render', async () => {
  // First render - API call
  const { unmount } = render(
    <FeatureFlagsProvider userId="test-user">
      <MyComponent />
    </FeatureFlagsProvider>
  );

  // Unmount
  unmount();

  // Second render - should use cache
  render(
    <FeatureFlagsProvider userId="test-user">
      <MyComponent />
    </FeatureFlagsProvider>
  );

  // Verify no additional API call made
});
```

### Mock Session Storage

```typescript
const mockSessionStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});
```

## Related Files

- **Context**: [FeatureFlagsContext.tsx](clockit_website/src/contexts/FeatureFlagsContext.tsx)
- **Hook**: [useFeature.ts](clockit_website/src/hooks/useFeature.ts)
- **Utilities**: [featureFlagCache.ts](clockit_website/src/utils/featureFlagCache.ts)
- **Provider Integration**: [Providers.tsx](clockit_website/src/components/Providers.tsx)
