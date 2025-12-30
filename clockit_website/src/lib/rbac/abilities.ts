/**
 * CASL Ability Definitions
 * Configures permissions for each role using CASL
 */

import { AbilityBuilder, PureAbility, AbilityClass, InferSubjects } from '@casl/ability';
import { Role, type Action, type Subject, type Permission } from './types';

// Define the types for our ability system
type AppSubjects = InferSubjects<Subject> | 'all';
type AppAbility = PureAbility<[Action, AppSubjects]>;
const AppAbility = PureAbility as AbilityClass<AppAbility>;

/**
 * Default role permissions
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    // Super admins can do everything
    { action: 'manage', subject: 'all' },
  ],
  [Role.ADMIN]: [
    // Admins can do everything
    { action: 'manage', subject: 'all' },
  ],
  [Role.USER]: [
    // Users can manage their own resources
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
    // Guests have limited read-only access
    { action: 'read', subject: 'Stats' },
  ],
  [Role.TEAM_ADMIN]: [
    // Team admins can manage team resources
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
    // Team members can view and contribute
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

/**
 * Build CASL ability from role
 */
export function defineAbilityFor(role: Role, customPermissions?: Permission[]): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(AppAbility);

  // Get base permissions for role
  const basePermissions = ROLE_PERMISSIONS[role] || [];
  const allPermissions = [...basePermissions, ...(customPermissions || [])];

  // Apply each permission
  for (const permission of allPermissions) {
    if (permission.inverted) {
      cannot(permission.action, permission.subject, permission.conditions);
    } else {
      if (permission.conditions) {
        can(permission.action, permission.subject, permission.conditions);
      } else if (permission.fields) {
        can(permission.action, permission.subject, permission.fields);
      } else {
        can(permission.action, permission.subject);
      }
    }
  }

  return build();
}

/**
 * Build CASL ability from user object
 */
export function defineAbilityForUser(user: {
  role: Role;
  permissions?: Permission[];
  uid?: string;
}): AppAbility {
  return defineAbilityFor(user.role, user.permissions);
}

/**
 * Check if a role has permission
 */
export function hasPermission(
  role: Role,
  action: Action,
  subject: Subject,
  customPermissions?: Permission[]
): boolean {
  const ability = defineAbilityFor(role, customPermissions);
  return ability.can(action, subject);
}

export { AppAbility };
export type { AppAbility as Ability, AppSubjects };
