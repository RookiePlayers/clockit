/**
 * Admin Setup Controller
 * Special endpoints for initial admin creation
 *
 * SECURITY: These endpoints should be disabled in production after initial setup
 * or protected with a special setup token
 */

import { Request, Response } from 'express';
import { getAuth } from '@/config/firebase-admin';
import { RBACService } from '@/services/rbac.service';
import { Role } from '@/types/rbac.types';
import { successResponse } from '@/utils/response';

const adminAuth = getAuth();

// Setup token - should be set via environment variable
// This prevents unauthorized admin creation in production
const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN || 'change-me-in-production';

export class AdminSetupController {
  /**
   * Create the first admin user
   * Protected by setup token
   *
   * POST /api/admin-setup/create-first-admin
   * Body: { email: string, setupToken: string }
   */
  static async createFirstAdmin(req: Request, res: Response): Promise<Response> {
    const { email, setupToken } = req.body;

    // Validate setup token
    if (setupToken !== SETUP_TOKEN) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_SETUP_TOKEN',
          message: 'Invalid setup token',
        },
      });
    }

    // Check if any admins already exist
    const existingUsers = await RBACService.listAllUsersWithRoles();
    const existingAdmins = existingUsers.filter(
      u => u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN
    );

    if (existingAdmins.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ADMIN_ALREADY_EXISTS',
          message: 'Admin users already exist. Use the RBAC API to manage roles.',
        },
      });
    }

    try {
      // Get user by email
      const userRecord = await adminAuth.getUserByEmail(email);

      // Set admin role
      await RBACService.setUserRole({
        userId: userRecord.uid,
        role: Role.ADMIN,
      });

      return successResponse(res, {
        message: 'First admin created successfully',
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          role: Role.ADMIN,
        },
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('no user record')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: `No user found with email "${email}". User must sign up first.`,
          },
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create admin',
        },
      });
    }
  }

  /**
   * Check setup status
   * Returns whether any admins exist
   *
   * GET /api/admin-setup/status
   */
  static async getSetupStatus(req: Request, res: Response): Promise<Response> {
    const existingUsers = await RBACService.listAllUsersWithRoles();
    const existingAdmins = existingUsers.filter(
      u => u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN
    );

    return successResponse(res, {
      needsSetup: existingAdmins.length === 0,
      adminCount: existingAdmins.length,
      totalUsers: existingUsers.length,
    });
  }

  /**
   * Bulk create admins from environment variable
   * Useful for initial deployment
   *
   * POST /api/admin-setup/init-from-env
   * Body: { setupToken: string }
   */
  static async initFromEnv(req: Request, res: Response): Promise<Response> {
    const { setupToken } = req.body;

    // Validate setup token
    if (setupToken !== SETUP_TOKEN) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_SETUP_TOKEN',
          message: 'Invalid setup token',
        },
      });
    }

    // Get admin emails from environment variable
    // Format: INITIAL_ADMIN_EMAILS=admin1@example.com,admin2@example.com
    const adminEmailsEnv = process.env.INITIAL_ADMIN_EMAILS;

    if (!adminEmailsEnv) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_ADMIN_EMAILS',
          message: 'INITIAL_ADMIN_EMAILS environment variable not set',
        },
      });
    }

    const emails = adminEmailsEnv.split(',').map(e => e.trim()).filter(Boolean);

    if (emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_ADMIN_EMAILS',
          message: 'No valid email addresses found in INITIAL_ADMIN_EMAILS',
        },
      });
    }

    const results = {
      success: [] as string[],
      failed: [] as { email: string; reason: string }[],
    };

    for (const email of emails) {
      try {
        const userRecord = await adminAuth.getUserByEmail(email);
        await RBACService.setUserRole({
          userId: userRecord.uid,
          role: Role.ADMIN,
        });
        results.success.push(email);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ email, reason });
      }
    }

    return successResponse(res, {
      message: `Created ${results.success.length} admin(s)`,
      results,
    });
  }
}
