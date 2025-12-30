/**
 * Feature Group Type Definitions
 * Feature groups are collections of related features that can be assigned to users
 */

export interface FeatureGroup {
  id: string;
  name: string;
  description?: string;
  features: Record<string, boolean>; // Map of feature name to enabled/disabled
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CreateFeatureGroupRequest {
  name: string;
  description?: string;
  features: Record<string, boolean>;
  isActive?: boolean;
}

export interface UpdateFeatureGroupRequest {
  name?: string;
  description?: string;
  features?: Record<string, boolean>;
  isActive?: boolean;
}

export interface FeatureGroupsResponse {
  featureGroups: FeatureGroup[];
}

export interface FeatureGroupResponse {
  featureGroup: FeatureGroup;
}
