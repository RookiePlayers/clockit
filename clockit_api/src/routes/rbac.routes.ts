/**
 * RBAC Routes
 * API endpoints for role and permission management
 */

import { Router } from 'express';
import { RBACController } from '@/controllers/rbac.controller';
import { authenticate } from '@/middleware/auth';
import { defaultRateLimiter } from '@/middleware/rate-limit';
import { asyncHandler } from '@/middleware/async-handler';
import { validateBody, validateParams } from '@/middleware/validate';
import { z } from 'zod';

const router = Router();

// Validation schemas
const setUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['super_admin', 'admin', 'user', 'guest', 'team_admin', 'team_member']),
  teamId: z.string().optional(),
});

const checkPermissionSchema = z.object({
  action: z.string().min(1),
  subject: z.string().min(1),
});

const userIdSchema = z.object({
  userId: z.string().min(1),
});

// Routes

// Get my role and permissions
router.get(
  '/me',
  authenticate,
  defaultRateLimiter,
  asyncHandler(RBACController.getMyRole)
);

// Set user role (admin only)
router.post(
  '/users/role',
  authenticate,
  defaultRateLimiter,
  validateBody(setUserRoleSchema),
  asyncHandler(RBACController.setUserRole)
);

// Get user's role
router.get(
  '/users/:userId/role',
  authenticate,
  defaultRateLimiter,
  validateParams(userIdSchema),
  asyncHandler(RBACController.getUserRole)
);

// Remove user's role (admin only)
router.delete(
  '/users/:userId/role',
  authenticate,
  defaultRateLimiter,
  validateParams(userIdSchema),
  asyncHandler(RBACController.removeUserRole)
);

// List all users with roles (admin only)
router.get(
  '/users',
  authenticate,
  defaultRateLimiter,
  asyncHandler(RBACController.listUsersWithRoles)
);

// Check permission
router.post(
  '/check',
  authenticate,
  defaultRateLimiter,
  validateBody(checkPermissionSchema),
  asyncHandler(RBACController.checkPermission)
);

export default router;
