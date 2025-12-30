import { Response } from 'express';
import { SessionsService } from '@/services/sessions.service';
import { noContentResponse, successResponse } from '@/utils/response';
import type { AuthenticatedRequest } from '@/types/auth.types';

export class SessionsController {
  /**
   * Save Clockit sessions
   */
  static async saveSessions(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const { sessions } = req.body;

    await SessionsService.saveSessions(uid, sessions);
    return noContentResponse(res);
  }

  /**
   * List all sessions with pagination
   */
  static async listSessions(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;
    const includeFullData = req.query.includeFullData === 'true';

    const sessions = await SessionsService.listSessions(uid, limit, includeFullData);
    return successResponse(res, sessions);
  }

  /**
   * Get a specific session
   */
  static async getSession(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const { sessionId } = req.params;

    const session = await SessionsService.getSession(uid, sessionId);
    return successResponse(res, session);
  }

  /**
   * Delete a session
   */
  static async deleteSession(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const { sessionId } = req.params;

    await SessionsService.deleteSession(uid, sessionId);
    return noContentResponse(res);
  }
}
