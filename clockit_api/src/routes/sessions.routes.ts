import { Router } from 'express';
import { SessionsController } from '@/controllers/sessions.controller';
import { authenticate } from '@/middleware/auth';
import { defaultRateLimiter } from '@/middleware/rate-limit';
import { asyncHandler } from '@/middleware/async-handler';
import { validateBody } from '@/middleware/validate';
import { z } from 'zod';

const router = Router();

// Validation schemas
const sessionSchema = z.object({
  id: z.string(),
}).passthrough(); // Allow additional fields

const saveSessionsSchema = z.object({
  sessions: z.array(sessionSchema),
});

// Routes

// List all sessions with pagination
router.get(
  '/',
  authenticate,
  defaultRateLimiter,
  asyncHandler(SessionsController.listSessions)
);

// Get a specific session
router.get(
  '/:sessionId',
  authenticate,
  defaultRateLimiter,
  asyncHandler(SessionsController.getSession)
);

// Save sessions
router.post(
  '/save',
  authenticate,
  defaultRateLimiter,
  validateBody(saveSessionsSchema),
  asyncHandler(SessionsController.saveSessions)
);

// Delete a session
router.delete(
  '/:sessionId',
  authenticate,
  defaultRateLimiter,
  asyncHandler(SessionsController.deleteSession)
);

export default router;
