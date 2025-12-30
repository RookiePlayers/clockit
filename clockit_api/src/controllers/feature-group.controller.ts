/**
 * Feature Group Controller
 * Handles HTTP requests for feature groups
 */

import { Request, Response } from 'express';
import { FeatureGroupService } from '@/services/feature-group.service';
import { successResponse, errorResponse } from '@/utils/response';
import type { AuthenticatedRequest } from '@/types/auth.types';

export class FeatureGroupController {
  /**
   * Create a new feature group
   * POST /api/feature-groups
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return errorResponse(res, 401, 'UNAUTHORIZED', 'Unauthorized');
      }

      const { name, description, features, isActive } = req.body;

      if (!name) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'Name is required');
      }

      const featureGroup = await FeatureGroupService.createFeatureGroup(userId, {
        name,
        description,
        features: features || {},
        isActive,
      });

      return successResponse(res, { featureGroup }, 201);
    } catch (error) {
      console.error('Error creating feature group:', error);
      return errorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Failed to create feature group'
      );
    }
  }

  /**
   * Get a feature group by ID
   * GET /api/feature-groups/:id
   */
  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const featureGroup = await FeatureGroupService.getFeatureGroup(id);

      if (!featureGroup) {
        return errorResponse(res, 404, 'NOT_FOUND', 'Feature group not found');
      }

      return successResponse(res, { featureGroup });
    } catch (error) {
      console.error('Error getting feature group:', error);
      return errorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Failed to get feature group'
      );
    }
  }

  /**
   * Get multiple feature groups by IDs
   * POST /api/feature-groups/batch
   * Body: { ids: string[] }
   */
  static async getByIds(req: Request, res: Response): Promise<Response> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'ids must be an array');
      }

      const featureGroups = await FeatureGroupService.getFeatureGroupsByIds(ids);

      return successResponse(res, { featureGroups });
    } catch (error) {
      console.error('Error getting feature groups by IDs:', error);
      return errorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Failed to get feature groups'
      );
    }
  }

  /**
   * List all feature groups
   * GET /api/feature-groups
   * Query params: activeOnly=true/false
   */
  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const activeOnly = req.query.activeOnly === 'true';

      const featureGroups = await FeatureGroupService.listFeatureGroups(activeOnly);

      return successResponse(res, { featureGroups });
    } catch (error) {
      console.error('Error listing feature groups:', error);
      return errorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Failed to list feature groups'
      );
    }
  }

  /**
   * Update a feature group
   * PUT /api/feature-groups/:id
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return errorResponse(res, 401, 'UNAUTHORIZED', 'Unauthorized');
      }

      const { id } = req.params;
      const { name, description, features, isActive } = req.body;

      const featureGroup = await FeatureGroupService.updateFeatureGroup(id, {
        name,
        description,
        features,
        isActive,
      });

      return successResponse(res, { featureGroup });
    } catch (error) {
      console.error('Error updating feature group:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return errorResponse(res, 404, 'NOT_FOUND', error.message);
      }

      return errorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Failed to update feature group'
      );
    }
  }

  /**
   * Delete a feature group
   * DELETE /api/feature-groups/:id
   */
  static async delete(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return errorResponse(res, 401, 'UNAUTHORIZED', 'Unauthorized');
      }

      const { id } = req.params;

      await FeatureGroupService.deleteFeatureGroup(id);

      return successResponse(res, { message: 'Feature group deleted successfully' });
    } catch (error) {
      console.error('Error deleting feature group:', error);
      return errorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Failed to delete feature group'
      );
    }
  }
}
