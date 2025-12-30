import { Router } from 'express';
import { UploadsController } from '@/controllers/uploads.controller';
import { authenticate } from '@/middleware/auth';
import { defaultRateLimiter } from '@/middleware/rate-limit';
import { asyncHandler } from '@/middleware/async-handler';
import { validateBody, validateParams } from '@/middleware/validate';
import { clearCache } from '@/middleware/cache';
import { idempotent } from '@/middleware/idempotency';
import { z } from 'zod';
import { CreateUploadRequestSchema } from '@/types/uploads.types';

const router = Router();

// Validation schemas


const uploadIdSchema = z.object({
  uploadId: z.string().min(1),
});

// Routes
router.post(
  '/',
  authenticate,
  defaultRateLimiter,
  idempotent({ ttl: 24 * 60 * 60 * 1000 }), // Prevent duplicate uploads for 24h
  clearCache('/api/uploads'), // Clear uploads cache on create
  validateBody(CreateUploadRequestSchema),
  asyncHandler(UploadsController.createUpload)
);

router.get(
  '/',
  authenticate,
  defaultRateLimiter,
  asyncHandler(UploadsController.listUploads)
);

router.get(
  '/:uploadId',
  authenticate,
  defaultRateLimiter,
  validateParams(uploadIdSchema),
  asyncHandler(UploadsController.getUpload)
);

router.delete(
  '/:uploadId',
  authenticate,
  defaultRateLimiter,
  idempotent({ ttl: 60 * 60 * 1000 }), // Prevent duplicate deletes for 1h
  clearCache('/api/uploads'), // Clear uploads cache on delete
  validateParams(uploadIdSchema),
  asyncHandler(UploadsController.deleteUpload)
);

export default router;
