import { Router } from 'express';
import { TokensController } from '@/controllers/tokens.controller';
import { authenticate } from '@/middleware/auth';
import { validateBody, validateParams } from '@/middleware/validation';
import { createTokenSchema, tokenIdSchema } from '@/validators/token.validator';
import { strictRateLimiter } from '@/middleware/rate-limit';

const router = Router();

router.post(
  '/',
  authenticate,
  strictRateLimiter,
  validateBody(createTokenSchema),
  TokensController.createToken
);

router.get('/', authenticate, TokensController.listTokens);

router.get(
  '/:tokenId',
  authenticate,
  validateParams(tokenIdSchema),
  TokensController.getToken
);

router.delete(
  '/:tokenId',
  authenticate,
  validateParams(tokenIdSchema),
  TokensController.revokeToken
);

export default router;
