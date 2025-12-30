/**
 * useFeature Hook
 *
 * This hook now uses the FeatureFlagsContext for caching.
 * If you're NOT using the FeatureFlagsProvider, it falls back to direct API calls.
 *
 * For best performance, wrap your app with FeatureFlagsProvider.
 */

import { useContext } from "react";
import type { FeatureEntitlement, FeatureGroup } from "@/services/featureFlags";
import { FeatureFlagsContext } from "@/contexts/FeatureFlagsContext";

type UseFeatureResult = {
  entitlement: FeatureEntitlement;
  featureGroups: FeatureGroup[];
  loading: boolean;
  error: Error | null;
  isFeatureEnabled: (feature: string) => boolean;
  isGroupEnabled: (group: string) => boolean;
  clearCache?: () => void;
  refetch?: () => Promise<void>;
  isAdmin: boolean;
};

/**
 * Hook to access feature flags with caching
 *
 * @returns Feature flags data and helper functions
 *
 * @example
 * ```tsx
 * const { isFeatureEnabled, loading } = useFeature();
 *
 * if (loading) return <Loading />;
 *
 * const canUseFeature = isFeatureEnabled('clockit-online');
 * ```
 */
export const useFeature = (): UseFeatureResult => {
  // Try to use context first (with caching)
  const context = useContext(FeatureFlagsContext);

  if (context) {
    // Context is available, use it (with caching)
    return {
      entitlement: context.entitlement,
      featureGroups: context.featureGroups,
      loading: context.loading,
      error: context.error,
      isFeatureEnabled: context.isFeatureEnabled,
      isGroupEnabled: context.isGroupEnabled,
      clearCache: context.clearCache,
      refetch: context.refetch,
      isAdmin: context.isAdmin,
    };
  }

  // Context not available - this shouldn't happen if provider is set up correctly
  // Fallback behavior: return guest entitlement
  console.warn(
    "useFeature: FeatureFlagsContext not found. " +
    "Make sure to wrap your app with <FeatureFlagsProvider>. " +
    "Falling back to guest entitlement."
  );

  return {
    entitlement: {
      id: "guest",
      name: "Guest",
      featureGroups: [],
    },
    featureGroups: [],
    loading: false,
    error: new Error("FeatureFlagsContext not found"),
    isFeatureEnabled: () => false,
    isGroupEnabled: () => false,
    isAdmin: false,
  };
};

export default useFeature;
