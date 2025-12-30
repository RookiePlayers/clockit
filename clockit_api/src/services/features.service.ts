import { FirestoreService } from './firestore.service';
import type { UserFeatureData, FeatureEntitlement } from '@/types/features.types';

const USERS_COLLECTION = 'Users';
const FEATURE_ENTITLEMENTS_COLLECTION = 'FeatureEntitlements';

export class FeaturesService {
  /**
   * Get user's feature entitlement data
   */
  static async getUserEntitlement(uid: string): Promise<UserFeatureData | null> {
    const documentPath = `${USERS_COLLECTION}/${uid}`;
    const userData = await FirestoreService.getDocument<UserFeatureData>(documentPath);
    return userData;
  }

  /**
   * Get a specific entitlement by ID
   */
  static async getEntitlement(entitlementId: string): Promise<FeatureEntitlement | null> {
    const documentPath = `${FEATURE_ENTITLEMENTS_COLLECTION}/${entitlementId}`;
    const entitlement = await FirestoreService.getDocument(documentPath);
    return entitlement ? { id: entitlementId, ...entitlement } as FeatureEntitlement : null;
  }

  /**
   * Set user's entitlement ID
   */
  static async setUserEntitlement(uid: string, entitlementId: string): Promise<void> {
    const documentPath = `${USERS_COLLECTION}/${uid}`;
    await FirestoreService.setDocument(documentPath, { entitlementId }, true); // merge
  }

  /**
   * List all available entitlements
   */
  static async listEntitlements(): Promise<FeatureEntitlement[]> {
    const entitlements = await FirestoreService.getAllDocuments<FeatureEntitlement>(FEATURE_ENTITLEMENTS_COLLECTION);
    return entitlements;
  }
}
