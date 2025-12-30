import { Router } from 'express';
import { GoalsController } from '@/controllers/goals.controller';
import { authenticate } from '@/middleware/auth';
import { defaultRateLimiter } from '@/middleware/rate-limit';
import { asyncHandler } from '@/middleware/async-handler';
import { validateBody, validateParams } from '@/middleware/validate';
import { z } from 'zod';

const router = Router();

// Validation schemas
const goalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  groupId: z.string().optional(),
  completed: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough(); // Allow additional fields

const goalGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough(); // Allow additional fields

const syncGoalsSchema = z.object({
  goals: z.array(goalSchema),
});

const syncGoalGroupsSchema = z.object({
  groups: z.array(goalGroupSchema),
});

const goalIdSchema = z.object({
  goalId: z.string().min(1),
});

const groupIdSchema = z.object({
  groupId: z.string().min(1),
});

// Routes
router.get(
  '/',
  authenticate,
  defaultRateLimiter,
  asyncHandler(GoalsController.getGoals)
);

router.post(
  '/sync',
  authenticate,
  defaultRateLimiter,
  validateBody(syncGoalsSchema),
  asyncHandler(GoalsController.syncGoals)
);

router.delete(
  '/:goalId',
  authenticate,
  defaultRateLimiter,
  validateParams(goalIdSchema),
  asyncHandler(GoalsController.deleteGoal)
);

router.get(
  '/groups',
  authenticate,
  defaultRateLimiter,
  asyncHandler(GoalsController.getGoalGroups)
);

router.post(
  '/groups/sync',
  authenticate,
  defaultRateLimiter,
  validateBody(syncGoalGroupsSchema),
  asyncHandler(GoalsController.syncGoalGroups)
);

router.delete(
  '/groups/:groupId',
  authenticate,
  defaultRateLimiter,
  validateParams(groupIdSchema),
  asyncHandler(GoalsController.deleteGoalGroup)
);

export default router;
