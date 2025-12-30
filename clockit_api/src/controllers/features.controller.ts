import { Response } from 'express';
import { FeaturesService } from '@/services/features.service';
import { successResponse, noContentResponse } from '@/utils/response';
import type { AuthenticatedRequest } from '@/types/auth.types';

export class FeaturesController {
  /**
   * Get user's entitlement
   */
  static async getUserEntitlement(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const userData = await FeaturesService.getUserEntitlement(uid);
    return successResponse(res, userData || {});
  }

  /**
   * Get specific entitlement
   */
  static async getEntitlement(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const { entitlementId } = req.params;
    const entitlement = await FeaturesService.getEntitlement(entitlementId);

    if (!entitlement) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Entitlement not found',
        },
      });
    }

    return successResponse(res, entitlement);
  }

  /**
   * Set user's entitlement
   */
  static async setUserEntitlement(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const { entitlementId } = req.body;

    await FeaturesService.setUserEntitlement(uid, entitlementId);
    return noContentResponse(res);
  }

  /**
   * List all entitlements
   */
  static async listEntitlements(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const entitlements = await FeaturesService.listEntitlements();
    return successResponse(res, entitlements);
  }
}
