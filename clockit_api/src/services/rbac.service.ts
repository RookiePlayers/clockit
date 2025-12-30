/**
 * RBAC Service
 * Manages roles and permissions using Firebase Admin Custom Claims
 */

import { getAuth } from '@/config/firebase-admin';
import { FirestoreService } from './firestore.service';
import { Role, type Permission, type SetUserRoleRequest } from '@/types/rbac.types';
import { AbilityBuilder, PureAbility, AbilityClass } from '@casl/ability';

const USER_ROLES_COLLECTION = 'UserRoles';

// CASL Ability type
type AppAbility = PureAbility<[string, string]>;
const AppAbility = PureAbility as AbilityClass<AppAbility>;

/**
 * Default role permissions (matches frontend)
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    { action: 'manage', subject: 'all' },
  ],
  [Role.ADMIN]: [
    { action: 'manage', subject: 'all' },
  ],
  [Role.USER]: [
    { action: 'create', subject: 'Upload' },
    { action: 'read', subject: 'Upload' },
    { action: 'update', subject: 'Upload' },
    { action: 'delete', subject: 'Upload' },
    { action: 'create', subject: 'Session' },
    { action: 'read', subject: 'Session' },
    { action: 'update', subject: 'Session' },
    { action: 'delete', subject: 'Session' },
    { action: 'create', subject: 'Goal' },
    { action: 'read', subject: 'Goal' },
    { action: 'update', subject: 'Goal' },
    { action: 'delete', subject: 'Goal' },
    { action: 'create', subject: 'GoalGroup' },
    { action: 'read', subject: 'GoalGroup' },
    { action: 'update', subject: 'GoalGroup' },
    { action: 'delete', subject: 'GoalGroup' },
    { action: 'read', subject: 'Stats' },
    { action: 'read', subject: 'Achievement' },
    { action: 'create', subject: 'Achievement' },
    { action: 'read', subject: 'User' },
    { action: 'update', subject: 'User' },
    { action: 'read', subject: 'Settings' },
    { action: 'update', subject: 'Settings' },
  ],
  [Role.GUEST]: [
    { action: 'read', subject: 'Stats' },
  ],
  [Role.TEAM_ADMIN]: [
    { action: 'manage', subject: 'Team' },
    { action: 'manage', subject: 'Workspace' },
    { action: 'invite', subject: 'User' },
    { action: 'read', subject: 'Upload' },
    { action: 'read', subject: 'Session' },
    { action: 'read', subject: 'Goal' },
    { action: 'read', subject: 'Stats' },
    { action: 'create', subject: 'Upload' },
    { action: 'update', subject: 'Upload' },
    { action: 'delete', subject: 'Upload' },
  ],
  [Role.TEAM_MEMBER]: [
    { action: 'read', subject: 'Team' },
    { action: 'read', subject: 'Workspace' },
    { action: 'read', subject: 'Upload' },
    { action: 'read', subject: 'Session' },
    { action: 'read', subject: 'Goal' },
    { action: 'read', subject: 'Stats' },
    { action: 'create', subject: 'Upload' },
    { action: 'create', subject: 'Session' },
  ],
};
const adminAuth = getAuth();
export class RBACService {
  /**
   * Set user's role via Firebase custom claims
   */
  static async setUserRole(request: SetUserRoleRequest): Promise<void> {
    const { userId, role, teamId } = request;

    // Set custom claims
    const customClaims: Record<string, any> = {
      role,
      permissions: ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[Role.USER],
    };

    if (teamId) {
      customClaims.teamId = teamId;
    }

    await adminAuth.setCustomUserClaims(userId, customClaims);

    // Also store in Firestore for querying
    const roleDoc = {
      userId,
      role,
      teamId: teamId || null,
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await FirestoreService.setDocument(`${USER_ROLES_COLLECTION}/${userId}`, roleDoc);
  }

  /**
   * Get user's role from custom claims
   */
  static async getUserRole(userId: string): Promise<Role> {
    try {
      const userRecord = await adminAuth.getUser(userId);
      const role = userRecord.customClaims?.role as Role;
      return role || Role.USER;
    } catch (error) {
      console.error('Error getting user role:', error);
      return Role.USER;
    }
  }

  /**
   * Get user's permissions
   */
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    const role = await this.getUserRole(userId);
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[Role.USER];
  }

  /**
   * Check if user has permission
   */
  static async hasPermission(
    userId: string,
    action: string,
    subject: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const ability = this.buildAbility(permissions);
    return ability.can(action, subject);
  }

  /**
   * Build CASL ability from permissions
   */
  private static buildAbility(permissions: Permission[]): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(AppAbility);

    for (const permission of permissions) {
      if (permission.inverted) {
        cannot(permission.action, permission.subject, permission.conditions);
      } else {
        if (permission.conditions) {
          can(permission.action, permission.subject, permission.conditions);
        } else {
          can(permission.action, permission.subject);
        }
      }
    }

    return build();
  }

  /**
   * List all users with their roles
   */
  static async listUsersWithRoles(): Promise<Array<{
    uid: string;
    email?: string;
    role: Role;
    teamId?: string;
  }>> {
    const users: Array<{
      uid: string;
      email?: string;
      role: Role;
      teamId?: string;
    }> = [];

    // Get all user role documents from Firestore
    const roleDocs = await FirestoreService.getAllDocuments<{
      userId: string;
      role: Role;
      teamId?: string;
    }>(USER_ROLES_COLLECTION);

    for (const roleDoc of roleDocs) {
      try {
        const userRecord = await adminAuth.getUser(roleDoc.userId);
        users.push({
          uid: userRecord.uid,
          email: userRecord.email,
          role: roleDoc.role,
          teamId: roleDoc.teamId,
        });
      } catch (error) {
        console.error(`Error fetching user ${roleDoc.userId}:`, error);
      }
    }

    return users;
  }

  /**
   * List all Auth users with their roles (includes users without role docs)
   */
  static async listAllUsersWithRoles(): Promise<Array<{
    uid: string;
    email?: string;
    role: Role;
    teamId?: string;
  }>> {
    const users: Array<{
      uid: string;
      email?: string;
      role: Role;
      teamId?: string;
    }> = [];

    let nextPageToken: string | undefined;

    do {
      const result = await adminAuth.listUsers(1000, nextPageToken);
      result.users.forEach((userRecord) => {
        const role = (userRecord.customClaims?.role as Role) || Role.USER;
        const teamId = userRecord.customClaims?.teamId as string | undefined;
        users.push({
          uid: userRecord.uid,
          email: userRecord.email,
          role,
          teamId,
        });
      });
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    return users;
  }

  /**
   * Remove user's role (revert to default USER role)
   */
  static async removeUserRole(userId: string): Promise<void> {
    await adminAuth.setCustomUserClaims(userId, {
      role: Role.USER,
      permissions: ROLE_PERMISSIONS[Role.USER],
    });

    await FirestoreService.deleteDocument(`${USER_ROLES_COLLECTION}/${userId}`);
  }

  /**
   * Bulk set roles for multiple users
   */
  static async bulkSetRoles(
    assignments: Array<{ userId: string; role: Role; teamId?: string }>
  ): Promise<void> {
    const promises = assignments.map(({ userId, role, teamId }) =>
      this.setUserRole({ userId, role, teamId })
    );

    await Promise.all(promises);
  }
}
