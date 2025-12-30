import { Response } from 'express';
import { GoalsService } from '@/services/goals.service';
import { successResponse, noContentResponse } from '@/utils/response';
import type { AuthenticatedRequest } from '@/types/auth.types';

export class GoalsController {
  /**
   * Get all goals
   */
  static async getGoals(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const result = await GoalsService.getGoals(uid);
    return successResponse(res, result);
  }

  /**
   * Get all goal groups
   */
  static async getGoalGroups(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const result = await GoalsService.getGoalGroups(uid);
    return successResponse(res, result);
  }

  /**
   * Sync goals to cloud
   */
  static async syncGoals(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const { goals } = req.body;

    await GoalsService.syncGoals(uid, goals);
    return noContentResponse(res);
  }

  /**
   * Sync goal groups to cloud
   */
  static async syncGoalGroups(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const { groups } = req.body;

    await GoalsService.syncGoalGroups(uid, groups);
    return noContentResponse(res);
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const { goalId } = req.params;

    await GoalsService.deleteGoal(uid, goalId);
    return noContentResponse(res);
  }

  /**
   * Delete a goal group
   */
  static async deleteGoalGroup(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const { groupId } = req.params;

    await GoalsService.deleteGoalGroup(uid, groupId);
    return noContentResponse(res);
  }
}
