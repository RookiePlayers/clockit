/**
 * Feature Group Routes
 */

import { Router } from 'express';
import { FeatureGroupController } from '@/controllers/feature-group.controller';
import { asyncHandler } from '@/middleware/async-handler';
import { authenticate } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createFeatureGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  features: z.record(z.string(), z.boolean()),
  isActive: z.boolean().optional(),
});

const updateFeatureGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  isActive: z.boolean().optional(),
});

const batchGetSchema = z.object({
  ids: z.array(z.string()),
});

// Create a feature group (authenticated)
router.post(
  '/',
  authenticate,
  validateBody(createFeatureGroupSchema),
  asyncHandler(FeatureGroupController.create)
);

// Get feature groups by IDs (batch)
router.post(
  '/batch',
  asyncHandler(FeatureGroupController.getByIds)
);

// List all feature groups
router.get(
  '/',
  asyncHandler(FeatureGroupController.list)
);

// Get a feature group by ID
router.get(
  '/:id',
  asyncHandler(FeatureGroupController.getById)
);

// Update a feature group (authenticated)
router.put(
  '/:id',
  authenticate,
  validateBody(updateFeatureGroupSchema),
  asyncHandler(FeatureGroupController.update)
);

// Delete a feature group (authenticated)
router.delete(
  '/:id',
  authenticate,
  asyncHandler(FeatureGroupController.delete)
);

export default router;
