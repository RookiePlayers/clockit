import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { TokenService } from '@/services/token.service';
import { successResponse, createdResponse, noContentResponse } from '@/utils/response';
import { CreateTokenInput, TokenIdInput } from '@/validators/token.validator';

export class TokensController {
  static async createToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const uid = req.user!.uid;
      const requestData = req.body as CreateTokenInput;

      const token = await TokenService.createToken(uid, requestData);
      createdResponse(res, token);
    } catch (error) {
      next(error);
    }
  }

  static async listTokens(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const uid = req.user!.uid;
      const tokens = await TokenService.listTokens(uid);
      successResponse(res, tokens);
    } catch (error) {
      next(error);
    }
  }

  static async getToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const uid = req.user!.uid;
      const { tokenId } = req.params as TokenIdInput;

      const token = await TokenService.getToken(tokenId, uid);
      successResponse(res, token);
    } catch (error) {
      next(error);
    }
  }

  static async revokeToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const uid = req.user!.uid;
      const { tokenId } = req.params as TokenIdInput;

      await TokenService.revokeToken(tokenId, uid);
      noContentResponse(res);
    } catch (error) {
      next(error);
    }
  }
}
