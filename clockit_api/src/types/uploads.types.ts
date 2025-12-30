import z from "zod";
import { SessionUpload, SessionUploadSchema } from "./types";
import { Timestamp } from "firebase-admin/firestore";

export interface UploadDocument {
  source?: string;
  filename?: string;
  uploadedAt: string;
  meta?: Record<string, unknown>;
  data: SessionUpload[];
}


export type UploadResponse = z.infer<typeof UploadResponseSchema>;

export const UploadResponseSchema = z.object({
  id: z.string(),
  source: z.string().optional(),
  filename: z.string().optional(),
  uploadedAt: z.union([
    z.string(),
    z.instanceof(Timestamp).transform(ts => ts.toDate().toISOString())
  ]),
  ideName: z.string().optional(),
  rowCount: z.number().optional().default(0),
  meta: z.record(z.unknown()).optional(),
  data: z.array(SessionUploadSchema).default([]),
});

export type CreateUploadRequest = z.infer<typeof CreateUploadRequestSchema>;
export const CreateUploadRequestSchema = z.object({
  filename: z.string(),
  data: z.array(SessionUploadSchema).default([]),
  meta: z.record(z.unknown()).optional(),
});

export const CreateUploadResponseSchema = z.object({
  id: z.string(),
  filename: z.string(),
  uploadedAt: z.string(),
  meta: z.record(z.unknown()).optional(),
  rowCount: z.number().optional().default(0),
});

export type CreateUploadResponse = z.infer<typeof CreateUploadResponseSchema>;