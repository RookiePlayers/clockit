import { Timestamp } from 'firebase-admin/firestore';
import z from 'zod';

export type ApiToken = z.infer<typeof ApiTokenSchema>;
export const ApiTokenSchema = z.object({
  id: z.string(),
  uid: z.string(),
  name: z.string(),
  tokenHash: z.string(),
  lastFour: z.string(),
  createdAt: z.union([z.instanceof(Timestamp), z.date()]),
  expiresAt: z.union([z.instanceof(Timestamp), z.date(), z.null()]),
  lastUsedAt: z.union([z.instanceof(Timestamp), z.date(), z.null()]),
});

export interface CreateTokenRequest {
  name: string;
  expiresInDays?: number;
}

export interface CreateTokenResponse {
  id: string;
  token: string;
  name: string;
  lastFour: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface TokenListItem {
  id: string;
  name: string;
  lastFour: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}
