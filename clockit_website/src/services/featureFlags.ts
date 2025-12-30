import { featuresApi, featureGroupsApi, type FeatureEntitlement } from "@/lib/api-client";
import type { FeatureGroup } from "@/types/feature-group.types";

export type { FeatureEntitlement, FeatureGroup };

export const DEFAULT_FEATURE_ENTITLEMENT_ID = "free";
export const DEFAULT_GUEST_ENTITLEMENT_ID = "guest";

export const DEFAULT_FEATURE_ENTITLEMENT: FeatureEntitlement = {
  id: DEFAULT_FEATURE_ENTITLEMENT_ID,
  name: "Free",
  featureGroups: ["clockit-online"],
};

export const DEFAULT_GUEST_ENTITLEMENT: FeatureEntitlement = {
  id: DEFAULT_GUEST_ENTITLEMENT_ID,
  name: "Guest",
  featureGroups: ["clockit-online"],
};

const normalizeGroups = (groups: string[] | undefined) => {
  return Array.from(new Set((groups ?? []).filter(Boolean)));
};

export const isGroupEnabled = (entitlement: FeatureEntitlement, groupId: string) => {
  return entitlement.featureGroups.includes(groupId);
};

export const getEntitlementLabel = (entitlement?: FeatureEntitlement | null) => {
  if (!entitlement?.name) {
    return DEFAULT_GUEST_ENTITLEMENT.name;
  }
  return entitlement.name;
};

export const getUserFeatureEntitlement = async (uid: string | null | undefined): Promise<FeatureEntitlement> => {
  if (!uid) {
    return {
      ...DEFAULT_GUEST_ENTITLEMENT,
      featureGroups: [...DEFAULT_GUEST_ENTITLEMENT.featureGroups],
    };
  }
  try {
    const response = await featuresApi.getUserEntitlement();
    const entitlementId = response.entitlementId ?? DEFAULT_FEATURE_ENTITLEMENT_ID;
    const entitlement = response.entitlement;

    if (!entitlement) {
      return {
        ...DEFAULT_FEATURE_ENTITLEMENT,
        featureGroups: [...DEFAULT_FEATURE_ENTITLEMENT.featureGroups],
      };
    }

    return {
      id: entitlementId,
      name: entitlement.name ?? DEFAULT_FEATURE_ENTITLEMENT.name,
      featureGroups: normalizeGroups(entitlement.featureGroups ?? DEFAULT_FEATURE_ENTITLEMENT.featureGroups),
    };
  } catch {
    return {
      ...DEFAULT_FEATURE_ENTITLEMENT,
      featureGroups: [...DEFAULT_FEATURE_ENTITLEMENT.featureGroups],
    };
  }
};

export const seedDefaultEntitlement = async () => {
  // Seeding is now handled by the backend API
  // This function is kept for backward compatibility but does nothing
  console.log("Seeding entitlements is handled by the backend");
};

/**
 * Fetch actual feature groups from the API by their IDs
 * This replaces the legacy FEATURE_GROUPS constant
 */
export const getFeatureGroupsByIds = async (groupIds: string[]): Promise<FeatureGroup[]> => {
  if (groupIds.length === 0) {
    return [];
  }

  try {
    const response = await featureGroupsApi.getByIds(groupIds);
    return response.featureGroups;
  } catch (error) {
    console.error("Error fetching feature groups:", error);
    return [];
  }
};

/**
 * Check if a feature is enabled in the user's entitlement
 * This checks against actual FeatureGroup data from the API
 */
export const isFeatureEnabledInGroups = (
  featureGroups: FeatureGroup[],
  featureId: string
): boolean => {
  return featureGroups.some((group) => group.features[featureId] === true);
};
