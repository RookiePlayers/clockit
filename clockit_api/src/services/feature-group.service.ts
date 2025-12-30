/**
 * Feature Group Service
 * Manages feature groups in Firestore
 */

import { randomUUID } from 'crypto';
import { FirestoreService } from './firestore.service';
import type {
  FeatureGroup,
  CreateFeatureGroupRequest,
  UpdateFeatureGroupRequest,
} from '@/types/feature-group.types';

const FEATURE_GROUPS_COLLECTION = 'FeatureGroups';

export class FeatureGroupService {
  /**
   * Create a new feature group
   */
  static async createFeatureGroup(
    userId: string,
    data: CreateFeatureGroupRequest
  ): Promise<FeatureGroup> {
    const now = new Date().toISOString();

    const featureGroup: FeatureGroup = {
      id: randomUUID(),
      name: data.name,
      description: data.description,
      features: data.features || [],
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await FirestoreService.setDocument(
      `${FEATURE_GROUPS_COLLECTION}/${featureGroup.id}`,
      featureGroup
    );

    return featureGroup;
  }

  /**
   * Get a feature group by ID
   */
  static async getFeatureGroup(id: string): Promise<FeatureGroup | null> {
    const doc = await FirestoreService.getDocument<FeatureGroup>(
      `${FEATURE_GROUPS_COLLECTION}/${id}`
    );
    return doc;
  }

  /**
   * Get multiple feature groups by IDs
   */
  static async getFeatureGroupsByIds(ids: string[]): Promise<FeatureGroup[]> {
    if (ids.length === 0) {
      return [];
    }

    const featureGroups: FeatureGroup[] = [];

    // Fetch in parallel
    const promises = ids.map((id) => this.getFeatureGroup(id));
    const results = await Promise.all(promises);

    // Filter out nulls
    results.forEach((result) => {
      if (result) {
        featureGroups.push(result);
      }
    });

    return featureGroups;
  }

  /**
   * Get all feature groups
   */
  static async listFeatureGroups(activeOnly = false): Promise<FeatureGroup[]> {
    const featureGroups = await FirestoreService.getAllDocuments<FeatureGroup>(
      FEATURE_GROUPS_COLLECTION
    );

    if (activeOnly) {
      return featureGroups.filter((fg) => fg.isActive);
    }

    return featureGroups;
  }

  /**
   * Update a feature group
   */
  static async updateFeatureGroup(
    id: string,
    updates: UpdateFeatureGroupRequest
  ): Promise<FeatureGroup> {
    const existing = await this.getFeatureGroup(id);
    if (!existing) {
      throw new Error(`Feature group not found: ${id}`);
    }

    const updated: FeatureGroup = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await FirestoreService.setDocument(
      `${FEATURE_GROUPS_COLLECTION}/${id}`,
      updated
    );

    return updated;
  }

  /**
   * Delete a feature group
   */
  static async deleteFeatureGroup(id: string): Promise<void> {
    await FirestoreService.deleteDocument(`${FEATURE_GROUPS_COLLECTION}/${id}`);
  }

  /**
   * Check if a feature group exists
   */
  static async exists(id: string): Promise<boolean> {
    const doc = await this.getFeatureGroup(id);
    return doc !== null;
  }
}
