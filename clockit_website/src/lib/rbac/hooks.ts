/**
 * RBAC Hooks
 * Convenient hooks for checking permissions in React components
 */

import { useAbility } from './AbilityContext';
import { type Action, type Subject, Role } from './types';

/**
 * Check if current user can perform an action on a subject
 */
export function useCan(action: Action, subject: Subject): boolean {
  const { ability } = useAbility();
  return ability.can(action, subject);
}

/**
 * Check if current user cannot perform an action on a subject
 */
export function useCannot(action: Action, subject: Subject): boolean {
  const { ability } = useAbility();
  return ability.cannot(action, subject);
}

/**
 * Get current user's role
 */
export function useRole(): Role {
  const { role } = useAbility();
  return role;
}

/**
 * Check if user has a specific role
 */
export function useHasRole(requiredRole: Role): boolean {
  const { role } = useAbility();
  return role === requiredRole;
}

/**
 * Check if user has any of the specified roles
 */
export function useHasAnyRole(roles: Role[]): boolean {
  const { role } = useAbility();
  return roles.includes(role);
}

/**
 * Check if user is an admin
 */
export function useIsAdmin(): boolean {
  const { role } = useAbility();
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

/**
 * Check if user is authenticated (not a guest)
 */
export function useIsAuthenticated(): boolean {
  const { role } = useAbility();
  return role !== Role.GUEST;
}
