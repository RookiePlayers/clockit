/**
 * Example showing how to use the updated useFeature hook
 * The hook now automatically fetches FeatureGroups from the API
 */

'use client';

import { useFeature } from '@/hooks/useFeature';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

export function UseFeatureExample() {
  const [user] = useAuthState(auth);

  // The hook now automatically:
  // 1. Fetches the user's FeatureEntitlement
  // 2. Gets the featureGroups IDs from the entitlement
  // 3. Fetches the actual FeatureGroup objects from the API
  // 4. Provides isFeatureEnabled() that checks against real FeatureGroups
  const {
    entitlement,
    featureGroups,
    loading,
    error,
    isFeatureEnabled,
    isGroupEnabled,
  } = useFeature(user?.uid);

  if (loading) {
    return <div>Loading features...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  // Check specific features
  const canUseClockitOnline = isFeatureEnabled('clockit-online');
  const canCreateGoals = isFeatureEnabled('create-goals-for-sessions');
  const canUseAdvancedAnalytics = isFeatureEnabled('advanced-analytics');

  // Check if entire group is enabled
  const hasClockitOnlineGroup = isGroupEnabled('clockit-online');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">useFeature Hook Example</h2>
        <p className="text-gray-600">
          This hook automatically fetches FeatureGroups from the API
        </p>
      </div>

      {/* Entitlement Info */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Your Entitlement</h3>
        <div className="space-y-1 text-sm">
          <p><span className="font-medium">Plan:</span> {entitlement.name}</p>
          <p><span className="font-medium">ID:</span> {entitlement.id}</p>
          <p>
            <span className="font-medium">Feature Group IDs:</span>{' '}
            {entitlement.featureGroups.join(', ')}
          </p>
        </div>
      </div>

      {/* Feature Groups Details */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Your Feature Groups</h3>
        {featureGroups.length === 0 ? (
          <p className="text-gray-500 text-sm">No feature groups loaded</p>
        ) : (
          <div className="space-y-3">
            {featureGroups.map((group) => (
              <div key={group.id} className="bg-gray-50 p-3 rounded">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">{group.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    group.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {group.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-2">{group.description}</p>
                )}
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Features:</span>{' '}
                  {group.features.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Checks */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Feature Access</h3>
        <div className="space-y-2">
          <FeatureCheck
            name="Clockit Online"
            enabled={canUseClockitOnline}
          />
          <FeatureCheck
            name="Create Goals for Sessions"
            enabled={canCreateGoals}
          />
          <FeatureCheck
            name="Advanced Analytics"
            enabled={canUseAdvancedAnalytics}
          />
        </div>
      </div>

      {/* Group Checks */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Group Access</h3>
        <div className="space-y-2">
          <FeatureCheck
            name="Clockit Online Group"
            enabled={hasClockitOnlineGroup}
          />
        </div>
      </div>

      {/* Usage in Components */}
      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="text-lg font-semibold mb-3">Conditional Rendering</h3>
        <div className="space-y-3">
          {canUseClockitOnline ? (
            <div className="bg-green-100 border border-green-300 rounded p-3">
              <p className="text-green-800 font-medium">✅ Clockit Online Feature</p>
              <p className="text-sm text-green-700 mt-1">
                This section is only visible if the feature is enabled
              </p>
            </div>
          ) : (
            <div className="bg-gray-100 border border-gray-300 rounded p-3">
              <p className="text-gray-600 font-medium">🔒 Clockit Online (Locked)</p>
              <p className="text-sm text-gray-500 mt-1">
                Upgrade your plan to access this feature
              </p>
            </div>
          )}

          {canCreateGoals && (
            <div className="bg-green-100 border border-green-300 rounded p-3">
              <p className="text-green-800 font-medium">✅ Goals Creation</p>
              <p className="text-sm text-green-700 mt-1">
                You can create goals for your sessions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Code Example */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">Usage Example</h3>
        <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`import { useFeature } from '@/hooks/useFeature';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

function MyComponent() {
  const [user] = useAuthState(auth);
  const {
    entitlement,
    featureGroups,
    isFeatureEnabled
  } = useFeature(user?.uid);

  const canUseFeature = isFeatureEnabled('clockit-online');

  return (
    <div>
      {canUseFeature && <ClockitOnlineFeature />}
    </div>
  );
}`}
        </pre>
      </div>
    </div>
  );
}

// Helper component
function FeatureCheck({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
      <span className="text-sm font-medium">{name}</span>
      <span className={`text-sm ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
        {enabled ? '✅ Enabled' : '❌ Disabled'}
      </span>
    </div>
  );
}
