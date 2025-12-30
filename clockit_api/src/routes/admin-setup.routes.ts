/**
 * Admin Setup Routes
 * Special routes for initial admin creation
 *
 * SECURITY WARNING: These routes should be disabled in production
 * after initial setup or protected with environment-based setup token
 */

import { Router } from 'express';
import { AdminSetupController } from '@/controllers/admin-setup.controller';
import { asyncHandler } from '@/middleware/async-handler';
import { validateBody } from '@/middleware/validate';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createFirstAdminSchema = z.object({
  email: z.string().email(),
  setupToken: z.string().min(1),
});

const initFromEnvSchema = z.object({
  setupToken: z.string().min(1),
});

// Only enable these routes in development or if explicitly enabled
const ENABLE_SETUP_ROUTES = process.env.ENABLE_ADMIN_SETUP === 'true' || process.env.NODE_ENV === 'development';

if (ENABLE_SETUP_ROUTES) {
  // Get setup status (no auth required)
  router.get(
    '/status',
    asyncHandler(AdminSetupController.getSetupStatus)
  );

  // Create first admin (no auth required, but needs setup token)
  router.post(
    '/create-first-admin',
    validateBody(createFirstAdminSchema),
    asyncHandler(AdminSetupController.createFirstAdmin)
  );

  // Initialize from environment variable (no auth required, but needs setup token)
  router.post(
    '/init-from-env',
    validateBody(initFromEnvSchema),
    asyncHandler(AdminSetupController.initFromEnv)
  );
} else {
  // If setup routes are disabled, return 404 for all routes
  router.all('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'SETUP_DISABLED',
        message: 'Admin setup routes are disabled. Set ENABLE_ADMIN_SETUP=true to enable.',
      },
    });
  });
}

export default router;
