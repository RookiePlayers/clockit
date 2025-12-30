/**
 * Feature Flag Cache Utilities
 *
 * Helper functions for managing feature flag cache in session storage
 */

const CACHE_KEY_PREFIX = "clockit_features_";

/**
 * Clear all feature flag caches from session storage
 * Useful for logout or when you want to force a refresh
 */
export function clearAllFeatureFlagCaches(): void {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.error("Error clearing feature flag caches:", err);
  }
}

/**
 * Clear feature flag cache for a specific user
 */
export function clearFeatureFlagCache(userId: string): void {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    sessionStorage.removeItem(cacheKey);
  } catch (err) {
    console.error("Error clearing feature flag cache:", err);
  }
}

/**
 * Get cache statistics (for debugging)
 */
export function getFeatureFlagCacheStats(): {
  totalCaches: number;
  cacheKeys: string[];
  totalSize: number;
} {
  try {
    const keys = Object.keys(sessionStorage);
    const featureCacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));

    let totalSize = 0;
    featureCacheKeys.forEach(key => {
      const value = sessionStorage.getItem(key);
      if (value) {
        totalSize += new Blob([value]).size;
      }
    });

    return {
      totalCaches: featureCacheKeys.length,
      cacheKeys: featureCacheKeys,
      totalSize,
    };
  } catch (err) {
    console.error("Error getting cache stats:", err);
    return {
      totalCaches: 0,
      cacheKeys: [],
      totalSize: 0,
    };
  }
}
