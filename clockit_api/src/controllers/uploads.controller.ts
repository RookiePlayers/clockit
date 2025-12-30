import { Response } from 'express';
import { UploadService } from '@/services/upload.service';
import { successResponse, createdResponse, noContentResponse } from '@/utils/response';
import type { AuthenticatedRequest } from '@/types/auth.types';

export class UploadsController {
  /**
   * Create a new CSV upload
   */
  static async createUpload(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const { filename, data } = req.body;
    const uid = req.user!.uid;

    const upload = await UploadService.createUpload(uid, { filename, data });
    return createdResponse(res, upload);
  }

  /**
   * List all CSV uploads
   */
  static async listUploads(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;
    const includeData = req.query.includeData === 'true';

    const uploads = await UploadService.listUploads(uid, limit, includeData);
    return successResponse(res, uploads);
  }

  /**
   * Get a specific CSV upload
   */
  static async getUpload(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const { uploadId } = req.params;

    const upload = await UploadService.getUpload(uid, uploadId);
    return successResponse(res, upload);
  }

  /**
   * Delete a CSV upload
   */
  static async deleteUpload(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const uid = req.user!.uid;
    const { uploadId } = req.params;

    await UploadService.deleteUpload(uid, uploadId);
    return noContentResponse(res);
  }
}
