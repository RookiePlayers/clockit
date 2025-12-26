import { useCallback, useEffect, useState } from "react";
import type { FeatureFlags } from "@/services/featureFlags";
import { getUserFeatureFlags, setUserFeatureFlag } from "@/services/featureFlags";

type UseFeatureFlagsResult = {
  flags: FeatureFlags;
  loading: boolean;
  error: Error | null;
  isEnabled: (flag: string, fallback?: boolean) => boolean;
  setFlag: (flag: string, value: boolean) => Promise<void>;
};

export const useFeatureFlags = (userId?: string | null): UseFeatureFlagsResult => {
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setFlags({});
      return () => { cancelled = true; };
    }
    const load = async () => {
      setLoading(true);
      try {
        const loaded:FeatureFlags = { 'clockit-online': true, 'clockit-goals': true }
        //await getUserFeatureFlags(userId);
        if (!cancelled) {
          setFlags(loaded);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to load feature flags"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setFlag = useCallback(
    async (flag: string, value: boolean) => {
      if (!userId) { return; }
      setFlags((prev) => ({ ...prev, [flag]: value }));
      try {
        await setUserFeatureFlag(userId, flag, value);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update feature flag"));
      }
    },
    [userId],
  );

  const isEnabled = useCallback(
    (flag: string, fallback = false) => {
      return flags[flag] ?? fallback;
    },
    [flags],
  );

  return { flags, loading, error, isEnabled, setFlag };
};

export default useFeatureFlags;
