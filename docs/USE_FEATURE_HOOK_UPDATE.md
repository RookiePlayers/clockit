# useFeature Hook - Updated for Feature Groups API

## What Changed?

The `useFeature` hook has been enhanced to automatically fetch actual FeatureGroup objects from the API instead of relying on the hardcoded `FEATURE_GROUPS` constant.

## Breaking Changes

**None!** The hook is backward compatible. Existing code will continue to work.

## New Features

### 1. Automatic FeatureGroup Fetching

The hook now returns `featureGroups` - the actual FeatureGroup objects from Firestore:

```typescript
const {
  entitlement,     // Same as before
  featureGroups,   // ✨ NEW - actual FeatureGroup objects
  loading,
  error,
  isFeatureEnabled,
  isGroupEnabled
} = useFeature(user?.uid);
```

### 2. Smart Feature Checking

The `isFeatureEnabled()` function now:
1. **First** checks against actual FeatureGroups from the API
2. **Falls back** to the legacy `FEATURE_GROUPS` constant if no groups loaded

This ensures compatibility while providing the benefit of dynamic feature groups.

## How It Works

```typescript
// Before (still works but uses hardcoded groups)
const { isFeatureEnabled } = useFeature(user?.uid);
const canUse = isFeatureEnabled('clockit-online');

// After (uses actual FeatureGroups from API)
const { featureGroups, isFeatureEnabled } = useFeature(user?.uid);
const canUse = isFeatureEnabled('clockit-online');

// You can now also inspect the groups
featureGroups.forEach(group => {
  console.log(group.name, group.features);
});
```

## Migration Path

### No Changes Required

If your code already uses `useFeature`, it will automatically benefit from the new API-based feature groups:

```typescript
// This code works before and after the update
function MyComponent() {
  const [user] = useAuthState(auth);
  const { isFeatureEnabled, loading } = useFeature(user?.uid);

  if (loading) return <div>Loading...</div>;

  const canUseFeature = isFeatureEnabled('clockit-online');

  return canUseFeature ? <Feature /> : <Locked />;
}
```

### Optional: Access FeatureGroups

If you want to use the new `featureGroups` data:

```typescript
function MyComponent() {
  const [user] = useAuthState(auth);
  const {
    entitlement,
    featureGroups, // ✨ Use this
    isFeatureEnabled,
    loading
  } = useFeature(user?.uid);

  return (
    <div>
      <h2>Your Plan: {entitlement.name}</h2>

      {/* Display feature groups */}
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
  );
}
```

## Benefits

1. **Dynamic Feature Management**: Features are now stored in Firestore, not hardcoded
2. **No Code Changes**: Works with existing code automatically
3. **Better UX**: Can display feature group names, descriptions, and details
4. **Flexibility**: Add/remove features without deploying code
5. **Backward Compatible**: Falls back to legacy system if API fails

## Under the Hood

```typescript
// The hook now does this automatically:
useEffect(() => {
  // 1. Fetch user's entitlement
  const entitlement = await getUserFeatureEntitlement(userId);

  // 2. Extract feature group IDs
  const groupIds = entitlement.featureGroups; // e.g., ["clockit-online"]

  // 3. Fetch actual FeatureGroup objects from API
  const groups = await getFeatureGroupsByIds(groupIds);
  // Returns: [{ id: "...", name: "Clockit Online", features: [...] }]

  // 4. Use these groups for feature checking
  setFeatureGroups(groups);
}, [userId]);
```

## Example: Before vs After

### Before (Hardcoded)

```typescript
// featureFlags.ts
export const FEATURE_GROUPS = {
  "clockit-online": {
    group: "clockit-online",
    features: ["clockit-online", "create-goals-for-sessions"]
  }
};

// Component
const { isFeatureEnabled } = useFeature(user?.uid);
const canUse = isFeatureEnabled('clockit-online'); // Checks hardcoded constant
```

### After (API-based)

```typescript
// Firestore FeatureGroups collection
{
  id: "abc123",
  name: "Clockit Online",
  description: "Online session tracking",
  features: ["clockit-online", "create-goals-for-sessions"],
  isActive: true
}

// Component (same code!)
const { isFeatureEnabled, featureGroups } = useFeature(user?.uid);
const canUse = isFeatureEnabled('clockit-online'); // Checks API data

// But now you can also:
console.log(featureGroups[0].name); // "Clockit Online"
console.log(featureGroups[0].description); // "Online session tracking"
```

## Performance

- FeatureGroups are fetched once per component mount
- Uses batch endpoint to fetch multiple groups in one request
- Falls back to legacy check if API call fails
- Consider using React Query or SWR for caching if needed

## Testing

```typescript
// Mock the API response
jest.mock('@/lib/api-client', () => ({
  featureGroupsApi: {
    getByIds: jest.fn().mockResolvedValue({
      featureGroups: [
        {
          id: 'test-group',
          name: 'Test Group',
          features: ['test-feature'],
          isActive: true
        }
      ]
    })
  }
}));

// Test component
const { result } = renderHook(() => useFeature('user123'));
await waitFor(() => expect(result.current.loading).toBe(false));
expect(result.current.featureGroups).toHaveLength(1);
```

## See Also

- [FEATURE_GROUPS_GUIDE.md](./FEATURE_GROUPS_GUIDE.md) - Complete Feature Groups documentation
- [UseFeatureExample.tsx](./clockit_website/src/components/UseFeatureExample.tsx) - Live example component
- [useFeature.ts](./clockit_website/src/hooks/useFeature.ts) - Hook source code
