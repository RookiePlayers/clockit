/**
 * RBAC Type Definitions (Backend)
 */

// Role definitions
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  TEAM_ADMIN = 'team_admin',
  TEAM_MEMBER = 'team_member',
}

// Action types
export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage'
  | 'upload'
  | 'download'
  | 'share'
  | 'export'
  | 'invite';

// Subject types
export type Subject =
  | 'Upload'
  | 'Session'
  | 'Goal'
  | 'GoalGroup'
  | 'Stats'
  | 'Achievement'
  | 'User'
  | 'Team'
  | 'Workspace'
  | 'Settings'
  | 'all';

// Permission definition
export interface Permission {
  action: Action;
  subject: Subject;
  conditions?: Record<string, any>;
  fields?: string[];
  inverted?: boolean;
  reason?: string;
}

// Set user role request
export interface SetUserRoleRequest {
  userId: string;
  role: Role;
  teamId?: string;
}

// User role response
export interface UserRoleResponse {
  userId: string;
  role: Role;
  teamId?: string;
  permissions: Permission[];
}

// List users response
export interface ListUsersWithRolesResponse {
  users: Array<{
    uid: string;
    email?: string;
    role: Role;
    teamId?: string;
  }>;
}
