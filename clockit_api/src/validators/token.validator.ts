import { z } from 'zod';

export const createTokenSchema = z.object({
  name: z.string().min(1).max(100).default('API Token'),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

export const tokenIdSchema = z.object({
  tokenId: z.string().min(1),
});

export type CreateTokenInput = z.infer<typeof createTokenSchema>;
export type TokenIdInput = z.infer<typeof tokenIdSchema>;
