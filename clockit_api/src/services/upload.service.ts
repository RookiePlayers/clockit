import { FirestoreService } from './firestore.service';
import {
  CreateUploadRequestSchema,
  UploadResponseSchema,
  type CreateUploadRequest,
  type CreateUploadResponse,
  type UploadResponse
} from '@/types/uploads.types';
import { firebaseDocTimestampWrapper } from '@/utils/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { Logger } from 'ruki-logger';

const UPLOADS_BASE = 'Uploads';
const CSV_COLLECTION = 'CSV';

export class UploadService {
  /**
   * Create a new CSV upload
   */
  static async createUpload(
    uid: string,
    request: CreateUploadRequest
  ): Promise<CreateUploadResponse> {
    const collectionPath = `${UPLOADS_BASE}/${uid}/${CSV_COLLECTION}`;

    // Count rows in CSV data
    const rowCount = Math.max(0, request.data.length - 1); // Exclude header row
    const schema = CreateUploadRequestSchema.safeParse(request);
    if (!schema.success) {
      Logger.error('UploadService.createUpload - Invalid upload request structure', {
        requestData: request,
        errors: schema.error.errors,
      });
      throw new Error(`Invalid upload request structure detected by server.`);
    }
    const uploadData = {
      filename: request.filename,
      data: request.data,
      rowCount,
      uploadedAt: serverTimestamp(),
      meta: request.meta || {},
    };

    const id = await FirestoreService.createDocument(collectionPath, uploadData);

    return {
      id,
      filename: request.filename,
      uploadedAt: uploadData.uploadedAt.toDate().toISOString(),
      rowCount,
      meta: request.meta || {},
    };
  }

  /**
   * List all CSV uploads for a user
   */
  static async listUploads(
    uid: string,
    limit: number = 10,
    includeData: boolean = false
  ): Promise<UploadResponse[]> {
    const collectionPath = `${UPLOADS_BASE}/${uid}/${CSV_COLLECTION}`;

    const uploads = await FirestoreService.queryDocuments<Record<string, unknown>>(
      collectionPath,
      [], // no filters
      'uploadedAt', // orderByField
      'desc', // orderDirection
      limit // limitCount
    );

    // Debug: log first upload to see structure
    if (uploads.length > 0) {
      console.log('Sample upload document:', JSON.stringify(uploads[0], null, 2));
    }

      // Return full upload data including CSV
      return uploads.map(upload => {
        return UploadService.processUploadData(upload);
      });

  }

  private static processUploadData(upload: Record<string, unknown>) {
    const data = firebaseDocTimestampWrapper(upload); // Wrap to handle timestamps
    const schema = UploadResponseSchema.safeParse(data);
    if (!schema.success) {
      Logger.error('UploadService.listUploads - Invalid upload data structure', {
        uploadData: data,
        errors: schema.error.errors,
      });
      throw new Error(`Invalid upload data structure detected by server.`);
    }
    const res = schema.data;
    const source = res.filename ? "manual" : "auto";
    const filename = res.filename || res.id;
    const ideName = res.source?.split('-')?.[0] ?? res.source ?? undefined;
    const count = res.data.length;
    res.source = source;
    res.filename = filename;
    res.ideName = ideName;
    res.rowCount = count;
    return schema.data;
  }

  /**
   * Get a specific CSV upload by ID
   */
  static async getUpload(uid: string, uploadId: string): Promise<UploadResponse> {
    const documentPath = `${UPLOADS_BASE}/${uid}/${CSV_COLLECTION}/${uploadId}`;
    const upload = await FirestoreService.getDocument<Record<string, unknown>>(documentPath);

    if (!upload) {
      throw new Error('Upload not found');
    }
    return UploadService.processUploadData(upload);
  }

  /**
   * Delete a CSV upload
   */
  static async deleteUpload(uid: string, uploadId: string): Promise<void> {
    const documentPath = `${UPLOADS_BASE}/${uid}/${CSV_COLLECTION}/${uploadId}`;
    await FirestoreService.deleteDocument(documentPath);
  }
}
function serverTimestamp() {
  return Timestamp.now();
}

