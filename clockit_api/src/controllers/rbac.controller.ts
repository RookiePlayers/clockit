/**
 * RBAC Controller
 * Handles role and permission management endpoints
 */

import { Response } from 'express';
import { RBACService } from '@/services/rbac.service';
import { successResponse, noContentResponse } from '@/utils/response';
import type { AuthenticatedRequest } from '@/types/auth.types';
import { Role } from '@/types/rbac.types';

const isAdminRole = (role: Role) => role === Role.ADMIN || role === Role.SUPER_ADMIN;

export class RBACController {
  /**
   * Set user's role (admin only)
   */
  static async setUserRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const { userId, role, teamId } = req.body;

    // Check if requesting user is admin
    const requestingUserRole = await RBACService.getUserRole(req.user!.uid);
    if (!isAdminRole(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can assign roles',
        },
      });
    }

    await RBACService.setUserRole({ userId, role, teamId });
    return noContentResponse(res);
  }

  /**
   * Get user's role
   */
  static async getUserRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const { userId } = req.params;

    // Users can only view their own role unless they're admin
    const requestingUserRole = await RBACService.getUserRole(req.user!.uid);
    if (userId !== req.user!.uid && !isAdminRole(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only view your own role',
        },
      });
    }

    const role = await RBACService.getUserRole(userId);
    const permissions = await RBACService.getUserPermissions(userId);

    return successResponse(res, { role, permissions });
  }

  /**
   * Get current user's role and permissions
   */
  static async getMyRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const userId = req.user!.uid;
    const role = await RBACService.getUserRole(userId);
    const permissions = await RBACService.getUserPermissions(userId);

    return successResponse(res, { role, permissions });
  }

  /**
   * List all users with roles (admin only)
   */
  static async listUsersWithRoles(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const requestingUserRole = await RBACService.getUserRole(req.user!.uid);
    if (!isAdminRole(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can list user roles',
        },
      });
    }

    const users = await RBACService.listAllUsersWithRoles();
    return successResponse(res, { users });
  }

  /**
   * Remove user's role (admin only)
   */
  static async removeUserRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const { userId } = req.params;

    const requestingUserRole = await RBACService.getUserRole(req.user!.uid);
    if (!isAdminRole(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can remove roles',
        },
      });
    }

    await RBACService.removeUserRole(userId);
    return noContentResponse(res);
  }

  /**
   * Check if user has specific permission
   */
  static async checkPermission(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const { action, subject } = req.body;
    const userId = req.user!.uid;

    const hasPermission = await RBACService.hasPermission(userId, action, subject);
    return successResponse(res, { hasPermission });
  }
}
