export interface UserFeatureData {
  entitlementId?: string;
  [key: string]: unknown;
}

export interface FeatureEntitlement {
  id: string;
  name: string;
  features: Record<string, boolean>;
  [key: string]: unknown;
}

export interface SetEntitlementRequest {
  entitlementId: string;
}
