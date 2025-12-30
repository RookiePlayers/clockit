/**
 * Feature Group Type Definitions (Frontend)
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
