import { Response } from 'express';
import { StatsService } from '@/services/stats.service';
import { successResponse, noContentResponse } from '@/utils/response';
import type { AuthenticatedRequest } from '@/types/auth.types';

export class StatsController {
  /**
   * Get stats for user
   */
  static async getStats(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const stats = await StatsService.getStats(uid);
    return successResponse(res, stats || {});
  }

  /**
   * Request stats refresh
   */
  static async refreshStats(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    await StatsService.refreshStats(uid);
    return noContentResponse(res);
  }

  /**
   * Save achievement
   */
  static async saveAchievement(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const achievement = req.body;

    await StatsService.saveAchievement(uid, achievement);
    return noContentResponse(res);
  }
}
